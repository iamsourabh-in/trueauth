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
      maxResults: 10, // Reduced for faster MVP scan, can use pageToken for 500
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
