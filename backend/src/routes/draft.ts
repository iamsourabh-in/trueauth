import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { getGmailClient } from '../config/google';
import { generateDraftReply } from '../services/ai.service';

export const draftRouter = Router();

draftRouter.post('/reply', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { threadId } = req.body;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    if (!threadId) return res.status(400).json({ error: 'Missing threadId' });

    const { data: tokenData } = await supabase.from('user_tokens').select('*').eq('user_id', userId).single();
    if (!tokenData?.gmail_token) return res.status(400).json({ error: 'Google tokens not found.' });

    const gmail = getGmailClient(tokenData.gmail_token, tokenData.refresh_token);

    // 1. Fetch current thread
    const thread = await gmail.users.threads.get({ userId: 'me', id: threadId });
    const msgs = thread.data.messages || [];
    const threadContext = msgs.map(m => m.snippet).join('\n');

    // 2. Fetch last 10 sent emails to learn tone
    const sent = await gmail.users.messages.list({ userId: 'me', q: 'in:sent', maxResults: 10 });
    const sentContextEmails = [];
    if (sent.data.messages) {
      for (const m of sent.data.messages) {
        if (!m.id) continue;
        try {
           const msgData = await gmail.users.messages.get({ userId: 'me', id: m.id });
           sentContextEmails.push(msgData.data.snippet || '');
        } catch(e) {}
      }
    }

    // 3. Generate Draft Content
    const draftContent = await generateDraftReply(sentContextEmails, threadContext);

    // 4. Create Draft via Gmail API
    // Need a raw RFC 2822 formatting for creating drafts
    // Simplification for MVP:
    const messageParts = [
      `To: recipient@example.com`,
      `Subject: Re: Follow up`,
      `Content-Type: text/plain; charset="UTF-8"`,
      '',
      draftContent
    ];
    const rawMessage = Buffer.from(messageParts.join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const draftRes = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
            message: { raw: rawMessage, threadId: threadId }
        }
    });

    res.json({ status: 'Draft created', draftId: draftRes.data.id });
  } catch (error: any) {
    console.error('Draft error:', error);
    res.status(500).json({ error: 'Failed to create draft', details: error.message });
  }
});
