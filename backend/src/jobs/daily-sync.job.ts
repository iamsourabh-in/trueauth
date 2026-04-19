import { supabase } from '../config/supabase';
import { getGmailClient } from '../config/google';
import { identifyCategory } from '../services/email.analysis.service';
import { saveEmails } from '../services/email.storage.service';
import { createLogger } from '../lib/logger';

const logger = createLogger('jobs.daily-sync');

export const processDailySync = async () => {
    logger.info('Starting daily global sync for all active users');
    
    // 1. Get all users who have tokens
    const { data: users, error } = await supabase
        .from('user_tokens')
        .select('*');

    if (error || !users) {
        logger.error('Failed to fetch users for daily sync', { error });
        return;
    }

    for (const user of users) {
        if (!user.gmail_token) continue;
        
        try {
            const gmail = getGmailClient(user.gmail_token, user.refresh_token);
            
            let query = '';
            if (user.last_sync_at) {
                const date = new Date(user.last_sync_at);
                date.setDate(date.getDate() - 1);
                const dateStr = date.toISOString().split('T')[0].replace(/-/g, '/');
                query = `after:${dateStr}`;
            }

            const listRes = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 100 });
            const messages = listRes.data.messages || [];

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
                            thread_id: msg.threadId || '',
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
                await saveEmails(user.user_id, validEmails);
                await supabase.from('user_tokens')
                    .update({ last_sync_at: new Date().toISOString() })
                    .eq('user_id', user.user_id);

                // Log the sync event
                await supabase.from('sync_log').insert({
                    user_id: user.user_id,
                    emails_count: validEmails.length,
                    status: 'success'
                });
            }
            logger.info('Daily sync completed for user', { userId: user.user_id, count: validEmails.length });
        } catch (e) {
            logger.error('Daily sync failed for user', { userId: user.user_id, error: e });
        }
    }
};
