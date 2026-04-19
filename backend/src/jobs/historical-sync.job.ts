import { supabase } from '../config/supabase';
import { getGmailClient } from '../config/google';
import { identifyCategory } from '../services/email.analysis.service';
import { saveEmails } from '../services/email.storage.service';
import { createLogger } from '../lib/logger';

const logger = createLogger('jobs.historical-sync');

export const processHistoricalSync = async (userId: string) => {
    logger.info('Starting historical sync', { userId });
    
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
        logger.info('Historical sync already completed for user', { userId });
        return;
    }

    // Mark as in progress if pending
    if (user.initial_sync_status === 'pending') {
        await supabase.from('user_tokens').update({ initial_sync_status: 'in_progress' }).eq('user_id', userId);
    }

    const gmail = getGmailClient(user.gmail_token, user.refresh_token);
    let pageToken = user.initial_sync_next_page_token || undefined;
    let totalSynced = 0;
    
    // We fetch in chunks to avoid timeouts/overwhelming resources
    // In a real production app, this would be re-queued per page.
    logger.info('Fetching page of historical emails', { userId, pageToken });

    try {
        const listRes = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 50,
            pageToken: pageToken
        });

        const messages = listRes.data.messages || [];
        const nextPageToken = listRes.data.nextPageToken;

        const emailDataBatch = await Promise.all(
            messages.map(async (msg) => {
                try {
                    const detail = await gmail.users.messages.get({ 
                        userId: 'me', id: msg.id as string, format: 'metadata',
                        metadataHeaders: ['From', 'Subject', 'Date', 'List-Unsubscribe']
                    });
                    const headers = detail.data.payload?.headers || [];
                    const labels = detail.data.labelIds || [];
                    const dateVal = headers.find(h => h.name?.toLowerCase() === 'date')?.value;
                    
                    return {
                        message_id: msg.id as string,
                        thread_id: msg.threadId as string,
                        sender: headers.find(h => h.name?.toLowerCase() === 'from')?.value || 'Unknown',
                        subject: headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)',
                        snippet: detail.data.snippet || '',
                        received_at: new Date(dateVal || Date.now()).toISOString(),
                        category: identifyCategory(headers, labels)
                    };
                } catch { return null; }
            })
        );

        const validEmails = emailDataBatch.filter(e => e !== null) as any[];
        if (validEmails.length > 0) {
            await saveEmails(userId, validEmails);
            totalSynced += validEmails.length;
        }

        // Update progress
        const updates: any = {
            initial_sync_next_page_token: nextPageToken || null,
            initial_sync_status: nextPageToken ? 'in_progress' : 'completed'
        };
        
        // If it's the first ever page, we set last_sync_at to now so manual sync doesn't fetch historicals again
        if (!user.last_sync_at) {
            updates.last_sync_at = new Date().toISOString();
        }

        await supabase.from('user_tokens').update(updates).eq('user_id', userId);

        logger.info('Historical sync page completed', { userId, count: validEmails.length, next: !!nextPageToken });

        // If there's more, we could recursively call or use a queue.
        // For this demo, let's assume we trigger another run later or use a loop for a few pages.
        if (nextPageToken) {
            // In a background worker env, you'd re-add to queue here.
            // For now, we'll let the next job invocation pick it up.
        }

    } catch (e: any) {
        logger.error('Historical sync failed at page', { userId, error: e.message });
    }
};
