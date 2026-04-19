import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getGmailClient } from '../config/google';
import { supabase } from '../config/supabase';
import { createLogger, requestLogMeta } from '../lib/logger';
import { identifyCategory } from '../services/email.analysis.service';
import { redis } from '../config/redis';


const logger = createLogger('routes.mailbox');

export const mailboxRouter = Router();

/**
 * @swagger
 * /mailbox/status:
 *   get:
 *     summary: Retrieve mailbox scan status
 *     description: Scans the authenticated user's Gmail to compute unread counts, total scanned, and risk signals.
 *     tags: [Mailbox]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scan results
 *       400:
 *         description: Google tokens missing
 *       401:
 *         description: Unauthorized
 */
mailboxRouter.get('/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    // 1. Fetch counts from DB
    const { data: counts, error: countError } = await supabase
      .from('emails')
      .select('category')
      .eq('user_id', userId);

    if (countError) throw countError;

    const stats = {
        spam: 0,
        promotions: 0,
        otp: 0,
        newsletters: 0,
        important: 0,
        other: 0,
        total: (counts || []).length
    };

    (counts || []).forEach(row => {
        const cat = (row.category || 'other').toLowerCase() as keyof typeof stats;
        if (stats[cat] !== undefined) stats[cat]++;
        else stats.other++;
    });

    // 2. Fetch tokens and Gmail unread count
    const { data: tokenData } = await supabase.from('user_tokens').select('*').eq('user_id', userId).single();
    if (!tokenData?.gmail_token) {
        return res.json({ ...stats, unreadCount: 0, status: 'incomplete' });
    }
    
    const gmail = getGmailClient(tokenData.gmail_token, tokenData.refresh_token);
    const unreadRes = await gmail.users.messages.list({ userId: 'me', q: 'is:unread', maxResults: 1 });
    const unreadCount = unreadRes.data.resultSizeEstimate || 0;

    res.json({
      ...stats,
      unreadCount,
      totalEmailsScanned: stats.total,
      riskSignals: 10, 
      status: 'completed'
    });

  } catch (error: any) {
    logger.error('Mailbox status error', { ...requestLogMeta(req), error: error.message });
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

/**
 * @swagger
 * /mailbox/sync:
 *   post:
 *     summary: Sync recent emails
 *     description: Fetches the last 100 emails from Gmail and stores them in Supabase (permanent storage) and Redis (hot cache).
 *     tags: [Mailbox]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync successful
 */
mailboxRouter.post('/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    const { data: tokenData } = await supabase.from('user_tokens').select('*').eq('user_id', userId).single();
    if (!tokenData?.gmail_token) return res.status(400).json({ error: 'Tokens missing' });

    const gmail = getGmailClient(tokenData.gmail_token, tokenData.refresh_token);
    
    // 1. Calculate the 'after:' date filter for incremental sync
    let query = '';
    if (tokenData.last_sync_at) {
        const date = new Date(tokenData.last_sync_at);
        date.setDate(date.getDate() - 1); 
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '/');
        query = `after:${dateStr}`;
    }

    // 2. Fetch messages since last sync (or last 100 if never sync'd)
    const listRes = await gmail.users.messages.list({ 
        userId: 'me', 
        q: query,
        maxResults: 100 
    });
    const messages = listRes.data.messages || [];

    const emailDataBatch = await Promise.all(
      messages.map(async (msg) => {
        if (!msg.id) return null;
        try {
          const detail = await gmail.users.messages.get({ 
            userId: 'me', id: msg.id, format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date', 'List-Unsubscribe']
          });
          const headers = detail.data.payload?.headers || [];
          const labels = detail.data.labelIds || [];
          const dateVal = headers.find(h => h.name?.toLowerCase() === 'date')?.value;
          
          return {
            message_id: msg.id,
            thread_id: msg.threadId || '',
            sender: headers.find(h => h.name?.toLowerCase() === 'from')?.value || 'Unknown',
            subject: headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)',
            snippet: detail.data.snippet || '',
            received_at: new Date(dateVal || Date.now()).toISOString(),
            category: identifyCategory(headers, labels)
          };
        } catch { return null; }
      })
    );

    const validEmails = emailDataBatch.filter(e => e !== null) as any[];
    if (validEmails.length > 0) {
      const { saveEmails } = await import('../services/email.storage.service');
      await saveEmails(userId, validEmails);
      
      // Update last_sync_at in DB
      await supabase.from('user_tokens')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', userId);
    }

    res.json({ status: 'completed', count: validEmails.length });
  } catch (error: any) {
    logger.error('Sync error', { ...requestLogMeta(req), error: error.message });
    res.status(500).json({ error: 'Sync failed' });
  }
});

/**
 * @swagger
 * /mailbox/emails:
 *   get:
 *     summary: Get stored emails
 *     description: Returns the user's stored emails. Checks Redis cache first, then Supabase.
 *     tags: [Mailbox]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of emails
 */
mailboxRouter.get('/emails', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    // 1. Try Redis Cache first
    const { getCachedEmails } = await import('../services/email.storage.service');
    let emails = await getCachedEmails(userId);

    // 2. Fallback to DB if cache empty
    if (!emails.length) {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', userId)
        .order('received_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      emails = data || [];
    }

    res.json({ emails });
  } catch (error: any) {
    logger.error('Get emails error', { ...requestLogMeta(req), error: error.message });
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

/**
 * @swagger
 * /mailbox/messages/{id}:
 *   delete:
 *     summary: Delete/Trash a specific message
 *     description: Moves the message to Gmail trash and removes it from Supabase storage.
 *     tags: [Mailbox]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted
 */
mailboxRouter.delete('/messages/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const messageId = req.params.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    const { data: tokenData } = await supabase.from('user_tokens').select('*').eq('user_id', userId).single();
    if (!tokenData?.gmail_token) {
      return res.status(400).json({ error: 'Google tokens not found.' });
    }

    const gmail = getGmailClient(tokenData.gmail_token, tokenData.refresh_token);

    // 1. Trash in Gmail
    await gmail.users.messages.trash({
      userId: 'me',
      id: messageId as string
    });

    // 2. Remove from Supabase
    await supabase.from('emails').delete().eq('message_id', messageId).eq('user_id', userId);

    // 3. Clear Redis cache for this user (safest way to ensure no ghost entries)
    const redisKey = `recent_emails:${userId}`;
    await redis.del(redisKey);

    res.json({ message: 'Success' });
  } catch (error: any) {
    logger.error('Delete message error', { ...requestLogMeta(req), error: error.message });
    res.status(500).json({ error: 'Failed to delete message' });
  }
});
