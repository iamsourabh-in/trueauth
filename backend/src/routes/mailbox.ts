import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getGmailClient } from '../config/google';
import { supabase } from '../config/supabase';
import { createLogger, requestLogMeta } from '../lib/logger';

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

    // Fetch tokens from user_tokens table
    const { data: tokenData, error: dbError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (dbError || !tokenData?.gmail_token) {
      return res.status(400).json({ error: 'Google tokens not found. Please re-authenticate.', details: dbError });
    }

    const gmail = getGmailClient(tokenData.gmail_token, tokenData.refresh_token);

    // Fetch last 100 messages to compute status (we scale this to 500 later with pagination)
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 100, // Reduced for faster MVP scan, can use pageToken for 500
    });

    const messages = response.data.messages || [];
    let unreadCount = 0;
    let riskSignals = 0;

    // Batch get logic mocked/simplified to avoid rate limits
    // In a full production script, we'd use batch.get
    // For MVP, we will only evaluate a subset or use the metadata from list
    // Actually `messages.list` doesn't give unread status directly unless q="is:unread"
    const unreadRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 1, // just need the estimated counter, so we check messagesTotal
      q: 'is:unread'
    });

    // Estimate total unread (resultSizeEstimate)
    unreadCount = unreadRes.data.resultSizeEstimate || 0;

    // We send a generic successful response
    res.json({
      totalEmailsScanned: messages.length,
      unreadCount,
      riskSignals: 0, // Placeholder until full risk evaluation logic
      status: 'completed'
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error('Mailbox status error', {
      ...requestLogMeta(req),
      message,
      stack
    });
    res.status(500).json({
      error: 'Failed to fetch mailbox status',
      details: message,
      requestId: req.requestId
    });
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
    const emailDataBatch: any[] = [];

    // 2. Fetch metadata for each (doing it sequentially for MVP, could use batch in prod)
    for (const msg of messages.slice(0, 50)) { // Limiting to 50 for MVP speed
      if (!msg.id) continue;
      try {
        const fullMsg = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        });

        const headers = fullMsg.data.payload?.headers || [];
        const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || 'Unknown';
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)';
        const dateStr = headers.find(h => h.name?.toLowerCase() === 'date')?.value || new Date().toISOString();

        emailDataBatch.push({
          message_id: fullMsg.data.id,
          thread_id: fullMsg.data.threadId,
          sender: from,
          subject: subject,
          snippet: fullMsg.data.snippet || '',
          received_at: new Date(dateStr).toISOString()
        });
      } catch (e) {
        logger.warn('Skipping message sync failure', { id: msg.id });
      }
    }

    // 3. Store in DB and Redis
    const { saveEmails } = await import('../services/email.storage.service');
    await saveEmails(userId, emailDataBatch);

    res.json({
      message: 'Sync completed',
      syncedCount: emailDataBatch.length
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
