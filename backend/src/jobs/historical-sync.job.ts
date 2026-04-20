import { supabase } from '../config/supabase';
import { getGmailClient } from '../config/google';
import { identifyCategory } from '../services/email.analysis.service';
import { saveEmails } from '../services/email.storage.service';
import { createLogger } from '../lib/logger';
import { syncQueue } from '../config/bull';
import { Job } from 'bull';

const logger = createLogger('jobs.historical-sync');

/**
 * Historical sync job processor.
 * Fetches one page of emails and re-queues itself if there are more.
 */
export const processHistoricalSync = async (job: Job<{ userId: string }>) => {
    const { userId } = job.data;
    logger.info('Running historical sync job', { userId, jobId: job.id });

    // 1. Get user tokens and current progress
    const { data: user, error } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !user || !user.gmail_token) {
        logger.error('Failed to get tokens for historical sync', { userId, error });
        return;
    }

    if (user.initial_sync_status === 'completed') {
        logger.info('Historical sync already marked as completed', { userId });
        return;
    }

    if (user.initial_sync_status === 'paused') {
        logger.info('Historical sync is paused by user', { userId });
        return;
    }

    const gmail = getGmailClient(user.gmail_token, user.refresh_token);
    const pageToken = user.initial_sync_next_page_token || undefined;

    try {
        const listRes = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 100,
            pageToken: pageToken
        });

        const messages = listRes.data.messages || [];
        const nextPageToken = listRes.data.nextPageToken;

        const emailDataBatch = await Promise.all(
            messages.map(async (msg) => {
                try {
                    const detail = await gmail.users.messages.get({
                        userId: 'me', id: msg.id as string, format: 'full'
                    });
                    
                    const payload = detail.data.payload;
                    const headers = payload?.headers || [];
                    const labels = detail.data.labelIds || [];
                    const internalDate = detail.data.internalDate;

                    // Extract body
                    let body = '';
                    if (payload?.parts) {
                        const part = payload.parts.find(p => p.mimeType === 'text/plain') || payload.parts[0];
                        if (part?.body?.data) {
                            body = Buffer.from(part.body.data, 'base64').toString();
                        }
                    } else if (payload?.body?.data) {
                        body = Buffer.from(payload.body.data, 'base64').toString();
                    }
                    
                    return {
                        message_id: msg.id as string,
                        thread_id: msg.threadId as string,
                        sender: headers.find(h => h.name?.toLowerCase() === 'from')?.value || 'Unknown',
                        subject: headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)',
                        snippet: detail.data.snippet || '',
                        body_plain: body || detail.data.snippet || '',
                        received_at: new Date(parseInt(internalDate || '0') || Date.now()).toISOString(),
                        category: identifyCategory(headers, labels)
                    };
                } catch { return null; }
            })
        );

        const validEmails = emailDataBatch.filter(e => e !== null) as any[];
        if (validEmails.length > 0) {
            await saveEmails(userId, validEmails);
        }

        // Update progress in DB
        const updates: any = {
            initial_sync_next_page_token: nextPageToken || null,
            initial_sync_status: nextPageToken ? 'in_progress' : 'completed'
        };

        // Ensure manual sync knows where the "new" stuff starts
        if (!user.last_sync_at) {
            updates.last_sync_at = new Date().toISOString();
        }

        await supabase.from('user_tokens').update(updates).eq('user_id', userId);

        logger.info('Historical sync batch processed', {
            userId,
            count: validEmails.length,
            hasMore: !!nextPageToken
        });

        // 3. RECURSION: If there's more, add another job to the queue with a slight delay
        if (nextPageToken) {
            await syncQueue.add({ userId }, {
                delay: 30000, // Wait 30 seconds to avoid hitting Google Rate Limits too hard
                removeOnComplete: true
            });
        }

    } catch (e: any) {
        logger.error('Historical sync batch failed', { userId, error: e.message });
        throw e; // Bull will retry if configured
    }
};
