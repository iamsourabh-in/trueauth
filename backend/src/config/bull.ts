import Queue from 'bull';
import dotenv from 'dotenv';
dotenv.config();

export const cleanupQueue = new Queue('cleanup', process.env.REDIS_URL || 'redis://localhost:6379');

// Define job processing logic here if needed, or import processors.
cleanupQueue.on('error', (err) => {
  console.error('Bull queue error:', err);
});
