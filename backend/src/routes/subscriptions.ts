import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getGmailClient } from '../config/google';
import { supabase } from '../config/supabase';
import { evaluateSubscription } from '../services/ai.service';

export const subscriptionsRouter = Router();

subscriptionsRouter.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    const { data: tokenData } = await supabase.from('user_tokens').select('*').eq('user_id', userId).single();
    if (!tokenData?.gmail_token) {
      return res.status(400).json({ error: 'Google tokens not found.' });
    }

    const gmail = getGmailClient(tokenData.gmail_token, tokenData.refresh_token);

    // Fetch the last 50 emails that have "unsubscribe" in them
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'unsubscribe',
      maxResults: 50
    });

    const messages = response.data.messages || [];
    const subscriptions = [];

    // Process a max of 10 concurrently to avoid rate limiting
    for (let i = 0; i < messages.length; i++) {
        if (!messages[i].id) continue;
        
        try {
            const msgObj = await gmail.users.messages.get({
                userId: 'me',
                id: messages[i].id as string,
                format: 'metadata',
                metadataHeaders: ['From', 'Subject', 'List-Unsubscribe']
            });

            const headers = msgObj.data.payload?.headers || [];
            const unsubscribeHeader = headers.find(h => h.name?.toLowerCase() === 'list-unsubscribe');
            const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from');

            if (unsubscribeHeader) {
                subscriptions.push({
                    id: msgObj.data.id,
                    sender: fromHeader?.value || 'Unknown Sender',
                    unsubscribeLink: unsubscribeHeader.value
                });
            }
            // For MVP, we skip LLM body evaluation on all emails to save time/cost unless requested explicitly
        } catch (e) {
            console.warn('Failed to fetch msg', messages[i].id);
        }
    }

    // Deduplicate by sender
    const uniqueSubs = Array.from(new Map(subscriptions.map(item => [item.sender, item])).values());

    res.json({ subscriptions: uniqueSubs });

  } catch (error: any) {
    console.error('Subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions', details: error.message });
  }
});
