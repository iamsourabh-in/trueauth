import Queue from 'bull';
import dotenv from 'dotenv';
import { createLogger } from '../lib/logger';

dotenv.config();

const logger = createLogger('config.bull');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Bull needs slightly different options structure for TLS
const queueOptions = REDIS_URL.startsWith('rediss://')
  ? { redis: { tls: { rejectUnauthorized: false } } }
  : {};

export const cleanupQueue = new Queue('cleanup', REDIS_URL, queueOptions);
export const syncQueue = new Queue('sync', REDIS_URL, queueOptions);
export const removalQueue = new Queue('removal', REDIS_URL, queueOptions);

cleanupQueue.on('error', (err: Error) => {
  logger.error('Bull queue connection error', { queue: 'cleanup', message: err.message, stack: err.stack });
});

syncQueue.on('error', (err: Error) => {
  logger.error('Bull queue connection error', { queue: 'sync', message: err.message, stack: err.stack });
});
