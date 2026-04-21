import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { cleanupQueue } from '../config/bull';
import { processCleanup } from '../jobs/cleanup.job';
import { createLogger, requestLogMeta } from '../lib/logger';

cleanupQueue.process(processCleanup);

const logger = createLogger('routes.cleanup');

export const cleanupRouter = Router();

/**
 * @swagger
 * /cleanup/trigger:
 *   post:
 *     summary: Trigger a background cleanup job
 *     description: Queues an automated cleanup job (e.g., archiving promotions or deleting OTPs).
 *     tags: [Cleanup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [archive-promotions, delete-otps, clear-junk, delete-spam]
 *     responses:
 *       200:
 *         description: Job successfully pushed to the Bull Queue.
 *       400:
 *         description: Invalid action type or missing tokens
 *       401:
 *         description: Unauthorized
 */
cleanupRouter.post('/trigger', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { action, customQuery } = req.body; // e.g. 'archive-promotions' or 'bulk-delete'

    if (!userId) return res.status(401).json({ error: 'User not found' });
    if (!['archive-promotions', 'delete-otps', 'clear-junk', 'delete-spam', 'bulk-delete'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action type' });
    }

    const { data: tokenData } = await supabase.from('user_tokens').select('*').eq('user_id', userId).single();
    if (!tokenData?.gmail_token) {
      return res.status(400).json({ error: 'Google tokens not found.' });
    }

    // Add job to Bull queue
    await cleanupQueue.add({
        userId,
        action,
        customQuery,
        tokens: tokenData
    }, {
        removeOnComplete: true
    });

    res.json({ status: 'queued', action });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Cleanup queue error', { ...requestLogMeta(req), message, stack: error instanceof Error ? error.stack : undefined });
    res.status(500).json({
      error: 'Failed to queue cleanup',
      details: message,
      requestId: req.requestId
    });
  }
});
