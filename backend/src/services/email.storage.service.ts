import { redis } from '../config/redis';
import { supabase } from '../config/supabase';
import { createLogger } from '../lib/logger';

const logger = createLogger('services.email-storage');

export interface EmailData {
  message_id: string;
  thread_id: string;
  sender: string;
  subject: string;
  snippet: string;
  body_plain?: string;
  received_at: string;
}

export const saveEmails = async (userId: string, emails: EmailData[]) => {
  if (!emails.length) return;

  try {
    // 1. Store in Supabase
    // We use upsert with onConflict on message_id to prevent duplicates
    const { error: dbError } = await supabase
      .from('emails')
      .upsert(
        emails.map(e => ({ ...e, user_id: userId })),
        { onConflict: 'message_id' }
      );

    if (dbError) {
      logger.error('Failed to store emails in Supabase', { userId, error: dbError.message });
      throw dbError;
    }

    // 2. Store recent 100 in Redis for this user
    // We'll use a Redis List to keep it simple. LPUSH followed by LTRIM.
    const redisKey = `recent_emails:${userId}`;
    
    // Sort emails by date descending before pushing to ensure newest at the top
    const sortedEmails = [...emails].sort((a, b) => 
      new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    );

    // Filter to keep only newest set if user sends a large burst
    const newestBatch = sortedEmails.slice(0, 100);

    // Store each email as a stringified JSON in the list
    // Note: This appends to the list. If we want to strictly keep the *latest* 100 
    // across multiple calls, we might need more logic or just flush and reload if it's a sync.
    // For now, let's just push and trim.
    const pipeline = redis.pipeline();
    newestBatch.forEach(e => {
        pipeline.lpush(redisKey, JSON.stringify(e));
    });
    pipeline.ltrim(redisKey, 0, 99); // Keep only 100 items
    
    await pipeline.exec();

    logger.info('Successfully stored emails in DB and Redis cache', { userId, count: emails.length });
  } catch (error) {
    logger.error('Email storage error', { userId, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
};

export const getCachedEmails = async (userId: string): Promise<EmailData[]> => {
    const redisKey = `recent_emails:${userId}`;
    const rawEmails = await redis.lrange(redisKey, 0, 99);
    return rawEmails.map(r => JSON.parse(r));
};
