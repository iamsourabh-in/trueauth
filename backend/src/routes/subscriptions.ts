import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getGmailClient } from '../config/google';
import { supabase } from '../config/supabase';
import { createLogger, requestLogMeta } from '../lib/logger';

const logger = createLogger('routes.subscriptions');

export const subscriptionsRouter = Router();

/**
 * @swagger
 * /subscriptions/:
 *   get:
 *     summary: Get all active subscriptions
 *     description: Parses recent emails to discover marketing subscriptions. Persists them to DB and returns unique list.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, unsubscribed] }
 *     responses:
 *       200:
 *         description: A deduplicated list of active subscriptions.
 */
subscriptionsRouter.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const statusFilter = req.query.status as string || 'active';
    if (!userId) return res.status(401).json({ error: 'User not found' });

    // 1. Check DB first for existing records
    const { data: dbSubs, error: dbError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', statusFilter);

    // If we have some and not forcing refresh, return them
    if (dbSubs && dbSubs.length > 0 && req.query.refresh !== 'true') {
        return res.json({ subscriptions: dbSubs });
    }

    // 2. Scan Gmail for NEW subscriptions (Discovery)
    const { data: tokenData } = await supabase.from('user_tokens').select('*').eq('user_id', userId).single();
    if (!tokenData?.gmail_token) return res.status(400).json({ error: 'Google tokens missing' });

    const gmail = getGmailClient(tokenData.gmail_token, tokenData.refresh_token);
    const response = await gmail.users.messages.list({ userId: 'me', q: 'unsubscribe', maxResults: 40 });
    const messages = response.data.messages || [];

    for (const msg of messages) {
        if (!msg.id) continue;
        try {
            const msgObj = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'metadata',
                metadataHeaders: ['From', 'List-Unsubscribe']
            });

            const headers = msgObj.data.payload?.headers || [];
            const unsub = headers.find(h => h.name?.toLowerCase() === 'list-unsubscribe')?.value;
            const from  = headers.find(h => h.name?.toLowerCase() === 'from')?.value;

            if (unsub && from) {
                // Upsert to DB - don't overwrite 'unsubscribed' status if already set
                await supabase.from('subscriptions').upsert({
                    user_id: userId,
                    sender: from,
                    unsubscribe_link: unsub,
                    message_id: msg.id,
                    status: 'active'
                }, { onConflict: 'user_id, sender', ignoreDuplicates: true });
            }
        } catch (e) {}
    }

    // 3. Final fetch from DB after discovery
    const { data: finalSubs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', statusFilter);

    res.json({ subscriptions: finalSubs || [] });

  } catch (error: any) {
    logger.error('Subs error', { ...requestLogMeta(req), error: error.message });
    res.status(500).json({ error: 'Failed to sync subscriptions' });
  }
});

/**
 * @swagger
 * /subscriptions/unsubscribe:
 *   post:
 *     summary: Mark a subscription as unsubscribed
 *     tags: [Subscriptions]
 */
subscriptionsRouter.post('/unsubscribe', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.body; // DB ID
    if (!userId || !id) return res.status(400).json({ error: 'Missing ID' });

    const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId);

    if (error) throw error;
    res.json({ message: 'Success' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});
