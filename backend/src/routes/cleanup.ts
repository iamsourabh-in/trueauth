import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { cleanupQueue } from '../config/bull';
import { processCleanup } from '../jobs/cleanup.job';

// Initialize queue processor
cleanupQueue.process(processCleanup);

export const cleanupRouter = Router();

cleanupRouter.post('/trigger', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { action } = req.body; // e.g. 'archive-promotions' or 'delete-otps'

    if (!userId) return res.status(401).json({ error: 'User not found' });
    if (!['archive-promotions', 'delete-otps', 'clear-junk'].includes(action)) {
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
        tokens: tokenData
    }, {
        removeOnComplete: true
    });

    res.json({ status: 'queued', action });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to queue cleanup', details: error.message });
  }
});
