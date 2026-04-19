import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { createLogger } from '../lib/logger';

const logger = createLogger('auth.middleware');

export interface AuthRequest extends Request {
  user?: any;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    logger.warn('Missing Authorization header', { requestId: req.requestId, path: req.path });
    return res.status(401).json({ error: 'Missing Authorization header', requestId: req.requestId });
  }

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    logger.warn('JWT validation failed', {
      requestId: req.requestId,
      path: req.path,
      code: error?.code,
      message: error?.message
    });
    return res.status(401).json({
      error: 'Invalid or expired token',
      details: error,
      requestId: req.requestId
    });
  }

  req.user = user;
  next();
};
