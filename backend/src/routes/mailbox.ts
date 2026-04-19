import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getGmailClient } from '../config/google';
import { supabase } from '../config/supabase';
import { createLogger, requestLogMeta } from '../lib/logger';
import { identifyCategory } from '../services/email.analysis.service';
import { redis } from '../config/redis';
import { syncQueue } from '../config/bull';
import { processHistoricalSync } from '../jobs/historical-sync.job';

// Init background processor
syncQueue.process(processHistoricalSync);


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

    // 1. Fetch counts from DB efficiently using counts rather than rows
    const [
      { count: total },
      { count: spam },
      { count: promotions },
      { count: otp },
      { count: newsletters },
      { count: important }
    ] = await Promise.all([
      supabase.from('emails').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('emails').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'spam'),
      supabase.from('emails').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'promotions'),
      supabase.from('emails').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'otp'),
      supabase.from('emails').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'newsletters'),
      supabase.from('emails').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'important'),
    ]);

    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('gmail_token, refresh_token, initial_sync_status')
      .eq('user_id', userId)
      .single();

    const stats: any = {
      spam: spam || 0,
      promotions: promotions || 0,
      otp: otp || 0,
      newsletters: newsletters || 0,
      important: important || 0,
      total: total || 0,
      other: (total || 0) - ((spam || 0) + (promotions || 0) + (otp || 0) + (newsletters || 0) + (important || 0)),
      initialSyncStatus: tokenData?.initial_sync_status || 'pending'
    };

    if (!tokenData?.gmail_token) {
      return res.json({ ...stats, unreadCount: 0, status: 'incomplete' });
    }

    const gmail = getGmailClient(tokenData.gmail_token, tokenData.refresh_token);

    // 2. Fetch Gmail profile and specific counts
    const [profileRes, starredRes, draftsRes, inboxRes] = await Promise.all([
      gmail.users.getProfile({ userId: 'me' }),
      gmail.users.labels.get({ userId: 'me', id: 'STARRED' }),
      gmail.users.labels.get({ userId: 'me', id: 'DRAFT' }),
      gmail.users.labels.get({ userId: 'me', id: 'INBOX' })
    ]);

    const totalEmailsInGmail = profileRes.data.messagesTotal || 0;
    const unreadCount = inboxRes.data.messagesUnread || 0;
    const starredCount = starredRes.data.messagesTotal || 0;
    const draftsCount = draftsRes.data.messagesTotal || 0;

    res.json({
      ...stats,
      unreadCount,
      starredCount,
      draftsCount,
      totalEmailsInGmail,
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
          const internalDate = detail.data.internalDate;
          
          return {
            message_id: msg.id,
            thread_id: msg.threadId || '',
            sender: headers.find(h => h.name?.toLowerCase() === 'from')?.value || 'Unknown',
            subject: headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)',
            snippet: detail.data.snippet || '',
            received_at: new Date(parseInt(internalDate || '0') || Date.now()).toISOString(),
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

      // Log the sync event
      await supabase.from('sync_log').insert({
        user_id: userId,
        emails_count: validEmails.length,
        status: 'success'
      });
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

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // 1. If it's the first page, try Redis Cache first
    if (page === 1) {
      const { getCachedEmails } = await import('../services/email.storage.service');
      const cached = await getCachedEmails(userId);
      if (cached.length >= limit) {
        return res.json({ emails: cached.slice(0, limit), page, hasMore: true });
      }
    }

    // 2. Fetch from DB with pagination
    const { data, error, count } = await supabase
      .from('emails')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    const emails = data || [];
    
    res.json({ 
      emails, 
      page, 
      total: count,
      hasMore: (offset + emails.length) < (count || 0)
    });
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

/**
 * Pause the historical background sync
 */
mailboxRouter.post('/historical/pause', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    await supabase.from('user_tokens')
      .update({ initial_sync_status: 'paused' })
      .eq('user_id', userId);
    
    res.json({ status: 'paused' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to pause scan' });
  }
});

/**
 * Resume the historical background sync
 */
mailboxRouter.post('/historical/resume', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    await supabase.from('user_tokens')
      .update({ initial_sync_status: 'in_progress' })
      .eq('user_id', userId);
    
    // Re-queue the job
    const { syncQueue } = await import('../config/bull');
    await syncQueue.add({ userId }, { removeOnComplete: true });

    res.json({ status: 'resumed' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to resume scan' });
  }
});
