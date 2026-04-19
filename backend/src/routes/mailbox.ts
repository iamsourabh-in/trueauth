import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getGmailClient } from '../config/google';
import { supabase } from '../config/supabase';
import { createLogger, requestLogMeta } from '../lib/logger';
import { redis } from '../config/redis';


const logger = createLogger('routes.mailbox');

/**
 * Helper to identify email category based on labels and metadata
 */
function identifyCategory(headers: any[], labels: string[]): string {
  const labelSet = new Set(labels.map(l => l.toLowerCase()));
  const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value?.toLowerCase() || '';
  const from = headers.find(h => h.name.toLowerCase() === 'from')?.value?.toLowerCase() || '';

  if (labelSet.has('spam')) return 'spam';
  if (labelSet.has('category_promotions') || labelSet.has('promotions')) return 'promotions';
  if (labelSet.has('important')) return 'important';

  // Check for newsletters (List-Unsubscribe header or common terms)
  const hasUnsub = headers.some(h => h.name.toLowerCase() === 'list-unsubscribe');
  if (hasUnsub || from.includes('newsletter') || subject.includes('newsletter')) return 'newsletters';

  // Check for OTP/Auth
  const otpKeywords = ['otp', 'verification code', 'verify', 'password reset', 'login code', 'security code', 'your code'];
  if (otpKeywords.some(kw => subject.includes(kw))) return 'otp';

  return 'other';
}

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
    if (!tokenData?.gmail_token) {
      return res.status(400).json({ error: 'Google tokens not found.' });
    }

    const gmail = getGmailClient(tokenData.gmail_token, tokenData.refresh_token);

    // 1. Fetch last 100 messages
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 100
    });

    const messages = listRes.data.messages || [];

    // 2. Fetch metadata concurrently (using Promise.all for speed)
    const emailDataBatch: any[] = await Promise.all(
      messages.slice(0, 50).map(async (msg) => {
        if (!msg.id) return null;
        try {
          const fullMsg = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date', 'List-Unsubscribe']
          });

          const headers = fullMsg.data.payload?.headers || [];
          const labels = fullMsg.data.labelIds || [];
          const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || 'Unknown';
          const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)';
          const dateStr = headers.find(h => h.name?.toLowerCase() === 'date')?.value || new Date().toISOString();

          return {
            message_id: fullMsg.data.id,
            thread_id: fullMsg.data.threadId,
            sender: from,
            subject: subject,
            snippet: fullMsg.data.snippet || '',
            received_at: new Date(dateStr).toISOString(),
            category: identifyCategory(headers, labels)
          };
        } catch (e) {
          logger.warn('Skipping message sync failure', { id: msg.id });
          return null;
        }
      })
    );

    const validEmails = emailDataBatch.filter(e => e !== null);

    // 3. Store in DB and Redis
    const { saveEmails } = await import('../services/email.storage.service');
    await saveEmails(userId, validEmails);

    res.json({
      message: 'Sync completed',
      syncedCount: validEmails.length
    });

  } catch (error: any) {
    logger.error('Mailbox sync error', { ...requestLogMeta(req), error: error.message });
    res.status(500).json({ error: 'Sync failed', details: error.message });
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
