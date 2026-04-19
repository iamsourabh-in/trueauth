import { Job } from 'bull';
import { getGmailClient } from '../config/google';
import { supabase } from '../config/supabase';

export const processCleanup = async (job: Job) => {
  const { userId, action, tokens } = job.data;
  
  const gmail = getGmailClient(tokens.gmail_token, tokens.refresh_token);

  try {
    if (action === 'archive-promotions') {
      // Find promotions
      const res = await gmail.users.messages.list({ userId: 'me', q: 'category:promotions', maxResults: 100 });
      const msgs = res.data.messages || [];
      
      for (const msg of msgs) {
         if (!msg.id) continue;
         // Remove inbox label, add ToReview or just remove INBOX
         await gmail.users.messages.modify({
             userId: 'me',
             id: msg.id,
             requestBody: { removeLabelIds: ['INBOX'] }
         });

         // Log to DB
         await supabase.from('cleanup_log').insert({
             user_id: userId,
             action_type: action,
             thread_id: msg.threadId,
             status: 'completed'
         });
      }
    } else if (action === 'delete-otps') {
       // Search for older than 1 hr, containing 6 digits mock q
       const res = await gmail.users.messages.list({ userId: 'me', q: 'older_than:1h OTP OR verification OR code', maxResults: 50 });
       const msgs = res.data.messages || [];

       for (const msg of msgs) {
         if (!msg.id) continue;
         await gmail.users.messages.trash({ userId: 'me', id: msg.id });
         await supabase.from('cleanup_log').insert({
             user_id: userId,
             action_type: action,
             thread_id: msg.threadId,
             status: 'completed'
         });
       }
    }
  } catch (error) {
    console.error('Job failed:', error);
    throw error;
  }
};
