import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { createLogger } from '../lib/logger';
import { AuthRequest } from './auth';

const logger = createLogger('middleware.premium');

/**
 * Middleware that checks whether the authenticated user has an active premium plan.
 * Must be used AFTER requireAuth so that req.user is populated.
 */
export const requirePremium = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not found' });
  }

  try {
    const { data } = await supabase
      .from('user_plans')
      .select('plan, expires_at')
      .eq('user_id', userId)
      .eq('plan', 'premium')
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      logger.info('Premium access denied — free plan user', { userId, path: req.path });
      return res.status(403).json({
        error: 'This feature requires a Premium subscription.',
        upgrade: true
      });
    }

    // User has active premium — continue
    next();
  } catch (error: any) {
    logger.error('Premium check failed', { userId, error: error.message });
    return res.status(500).json({ error: 'Failed to verify subscription status' });
  }
};
