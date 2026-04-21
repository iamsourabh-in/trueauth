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
  category?: string;
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

    logger.info('Successfully stored emails in DB', { userId, count: emails.length });
  } catch (error) {
    logger.error('Email storage error', { userId, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
};
