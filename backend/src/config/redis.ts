import Redis from 'ioredis';
import dotenv from 'dotenv';
import { createLogger } from '../lib/logger';

dotenv.config();

const logger = createLogger('config.redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL);

redis.on('error', (err: Error) => {
  logger.error('Redis connection error', { message: err.message, stack: err.stack });
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});
