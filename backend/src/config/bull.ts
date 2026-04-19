import Queue from 'bull';
import dotenv from 'dotenv';
import { createLogger } from '../lib/logger';

dotenv.config();

const logger = createLogger('config.bull');

export const cleanupQueue = new Queue('cleanup', process.env.REDIS_URL || 'redis://localhost:6379');

cleanupQueue.on('error', (err: Error) => {
  logger.error('Bull queue connection error', { message: err.message, stack: err.stack });
});
