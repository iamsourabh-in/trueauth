import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../lib/logger';

const logger = createLogger('http');

/**
 * Express 5 forwards async errors here. Logs stack and returns JSON (no stack in production body).
 */
export function notFoundHandler(req: Request, res: Response) {
  logger.warn('Route not found', {
    requestId: req.requestId,
    method: req.method,
    path: req.path
  });
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    requestId: req.requestId
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  logger.error('Unhandled error', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    message,
    stack
  });

  if (res.headersSent) {
    return next(err);
  }

  const body: Record<string, unknown> = {
    error: 'Internal server error',
    requestId: req.requestId
  };
  if (process.env.NODE_ENV !== 'production' && message) {
    body.detail = message;
  }

  res.status(500).json(body);
}
