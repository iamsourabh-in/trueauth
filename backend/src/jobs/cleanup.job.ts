import { Job } from 'bull';
import { getGmailClient } from '../config/google';
import { supabase } from '../config/supabase';
import { createLogger } from '../lib/logger';

const logger = createLogger('jobs.cleanup');

export const processCleanup = async (job: Job) => {
  const { userId, action, tokens } = job.data;

  const gmail = getGmailClient(tokens.gmail_token, tokens.refresh_token);

  try {
    if (action === 'archive-promotions') {
      // Ensure 'ToReview' label exists globally before looping
      let toReviewLabelId: string | undefined;
      const labelsRes = await gmail.users.labels.list({ userId: 'me' });
      const existingLabel = (labelsRes.data.labels || []).find(l => l.name?.toLowerCase() === 'toreview');

      if (existingLabel && existingLabel.id) {
        toReviewLabelId = existingLabel.id;
      } else {
        const createRes = await gmail.users.labels.create({
          userId: 'me',
          requestBody: {
            name: 'ToReview',
            labelListVisibility: 'labelShow',
            messageListVisibility: 'show'
          }
        });
        toReviewLabelId = createRes.data.id ?? undefined;
      }

      // Find promotions
      const res = await gmail.users.messages.list({ userId: 'me', q: 'category:promotions', maxResults: 100 });
      const msgs = res.data.messages || [];

      for (const msg of msgs) {
        if (!msg.id) continue;

        // Remove inbox label, add ToReview  @clean
        await gmail.users.messages.modify({
          userId: 'me',
          id: msg.id,
          requestBody: {
            removeLabelIds: ['INBOX'],
            addLabelIds: toReviewLabelId ? [toReviewLabelId] : []
          }
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
      const res = await gmail.users.messages.list({ userId: 'me', q: 'older_than:24h OTP OR verification OR code', maxResults: 100 });
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
    } else if (action === 'delete-spam') {
      const res = await gmail.users.messages.list({ userId: 'me', q: 'in:spam', maxResults: 100 });
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
    } else if (action === 'clear-junk') {
      const res = await gmail.users.messages.list({ userId: 'me', q: 'label:junk OR "unsubscribe" older_than:30d', maxResults: 100 });
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
    } else if (action === 'bulk-delete') {
      const customQuery = job.data.customQuery;
      if (!customQuery) throw new Error('Query required for bulk delete');

      const res = await gmail.users.messages.list({ userId: 'me', q: customQuery, maxResults: 100 });
      const msgs = res.data.messages || [];

      for (const msg of msgs) {
        if (!msg.id) continue;
        await gmail.users.messages.trash({ userId: 'me', id: msg.id });
        await supabase.from('cleanup_log').insert({
          user_id: userId,
          action_type: 'bulk-delete',
          thread_id: msg.threadId,
          status: 'completed'
        });
      }
    }
  } catch (error: unknown) {
    logger.error('Cleanup job failed', {
      jobId: job.id,
      userId,
      action,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};
