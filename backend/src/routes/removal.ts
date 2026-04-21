import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { removalQueue } from '../config/bull';
import { processRemoval } from '../jobs/removal.job';
import { createLogger } from '../lib/logger';

const logger = createLogger('routes.removal');

removalQueue.process(processRemoval);

export const removalRouter = Router();

/**
 * Get Brokers and Removal Statuses
 */
removalRouter.get('/status', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'User not found' });
        
        // Return static list + dynamic statuses merged
        const BROKERS = [
          { id: 'whitepages', name: 'Whitepages' },
          { id: 'spokeo', name: 'Spokeo' },
          { id: 'beenverified', name: 'BeenVerified' },
          { id: 'intelius', name: 'Intelius' },
          { id: 'truthfinder', name: 'TruthFinder' }
        ];

        const { data: logData } = await supabase
            .from('data_removal_requests')
            .select('*')
            .eq('user_id', userId);

        const logs = logData || [];

        const statusResponse = BROKERS.map(b => {
             const track = logs.find(l => l.broker_id === b.id);
             return {
                 id: b.id,
                 name: b.name,
                 status: track?.status || 'uninitiated'
             };
        });

        res.json({ statuses: statusResponse, logs: logs });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * Save an Identity token
 */
removalRouter.post('/identity', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        const { type, value } = req.body;
        if (!userId) return res.status(401).json({ error: 'User not found' });
        if (!['email', 'phone', 'address'].includes(type) || !value) return res.status(400).json({ error: 'Invalid details' });

        await supabase.from('data_removal_identities').upsert({
            user_id: userId,
            id_type: type,
            id_value: value
        }, { onConflict: 'user_id,id_type,id_value' });
        
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * Trigger the Data Removal Background Scan
 */
removalRouter.post('/trigger', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    const { data: tokenData } = await supabase.from('user_tokens').select('*').eq('user_id', userId).single();
    if (!tokenData?.gmail_token) {
      return res.status(400).json({ error: 'Google tokens not found.' });
    }

    // Add job to Bull queue
    await removalQueue.add({
        userId,
        tokens: tokenData
    }, {
        removeOnComplete: true
    });

    res.json({ status: 'queued' });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to queue removal' });
  }
});
