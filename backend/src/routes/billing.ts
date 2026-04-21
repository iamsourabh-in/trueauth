import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { createLogger } from '../lib/logger';

const logger = createLogger('routes.billing');

export const billingRouter = Router();

/**
 * GET /billing/plan — Returns the user's current plan status
 */
billingRouter.get('/plan', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    const { data } = await supabase
      .from('user_plans')
      .select('plan, starts_at, expires_at')
      .eq('user_id', userId)
      .eq('plan', 'premium')
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      return res.json({
        plan: 'premium',
        starts_at: data.starts_at,
        expires_at: data.expires_at
      });
    }

    res.json({ plan: 'free' });
  } catch (error: any) {
    logger.error('Get plan error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

/**
 * POST /billing/purchase — Simulated purchase (upgrades user to premium for 1 year)
 * In production, replace this with a Razorpay/Stripe webhook handler.
 */
billingRouter.post('/purchase', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { error } = await supabase.from('user_plans').insert({
      user_id: userId,
      plan: 'premium',
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString()
    });

    if (error) throw error;

    logger.info('User upgraded to premium', { userId, expires_at: expiresAt.toISOString() });

    res.json({
      plan: 'premium',
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      message: 'Successfully upgraded to Premium!'
    });
  } catch (error: any) {
    logger.error('Purchase error', { error: error.message });
    res.status(500).json({ error: 'Failed to process purchase' });
  }
});
