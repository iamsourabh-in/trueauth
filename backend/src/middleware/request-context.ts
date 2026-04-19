import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Assigns X-Request-Id (or generates one) so logs and error responses can be correlated.
 */
export function requestContext(req: Request, res: Response, next: NextFunction) {
  const fromHeader = req.headers['x-request-id'];
  const id = typeof fromHeader === 'string' && fromHeader.trim() ? fromHeader.trim() : randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
