import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getGmailClient } from '../config/google';
import { supabase } from '../config/supabase';
import { createLogger, requestLogMeta } from '../lib/logger';
import { identifyCategory, analyzeEmailWithAI } from '../services/email.analysis.service';
import { requirePremium } from '../middleware/premium';
import { syncQueue } from '../config/bull';
import { processHistoricalSync } from '../jobs/historical-sync.job';

// Init background processor
syncQueue.process(processHistoricalSync);


const logger = createLogger('routes.mailbox');

export const mailboxRouter = Router();

/**
 * @swagger
 * /mailbox/status:
 *   get:
 *     summary: Retrieve mailbox scan status
 *     description: Scans the authenticated user's Gmail to compute unread counts, total scanned, and risk signals.
 *     tags: [Mailbox]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scan results
 *       400:
 *         description: Google tokens missing
 *       401:
 *         description: Unauthorized
 */
mailboxRouter.get('/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    // 1. Fetch counts from DB efficiently using counts rather than rows
    const [
      { count: total },
      { count: spam },
      { count: promotions },
      { count: otp },
      { count: newsletters },
      { count: important }
    ] = await Promise.all([
      supabase.from('emails').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('emails').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'spam'),
      supabase.from('emails').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'promotions'),
      supabase.from('emails').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'otp'),
      supabase.from('emails').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'newsletters'),
      supabase.from('emails').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'important'),
    ]);

    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('gmail_token, refresh_token, initial_sync_status')
      .eq('user_id', userId)
      .single();

    const stats: any = {
      spam: spam || 0,
      promotions: promotions || 0,
      otp: otp || 0,
      newsletters: newsletters || 0,
      important: important || 0,
      total: total || 0,
      other: (total || 0) - ((spam || 0) + (promotions || 0) + (otp || 0) + (newsletters || 0) + (important || 0)),
      initialSyncStatus: tokenData?.initial_sync_status || 'pending'
    };

    if (!tokenData?.gmail_token) {
      return res.json({ ...stats, unreadCount: 0, status: 'incomplete' });
    }

    const gmail = getGmailClient(tokenData.gmail_token, tokenData.refresh_token);

    // 2. Fetch Gmail profile and specific counts
    const [profileRes, starredRes, draftsRes, inboxRes] = await Promise.all([
      gmail.users.getProfile({ userId: 'me' }),
      gmail.users.labels.get({ userId: 'me', id: 'STARRED' }),
      gmail.users.labels.get({ userId: 'me', id: 'DRAFT' }),
      gmail.users.labels.get({ userId: 'me', id: 'INBOX' })
    ]);

    const totalEmailsInGmail = profileRes.data.messagesTotal || 0;
    const unreadCount = inboxRes.data.messagesUnread || 0;
    const starredCount = starredRes.data.messagesTotal || 0;
    const draftsCount = draftsRes.data.messagesTotal || 0;

    res.json({
      ...stats,
      unreadCount,
      starredCount,
      draftsCount,
      totalEmailsInGmail,
      totalEmailsScanned: stats.total,
      riskSignals: 10,
      status: 'completed'
    });

  } catch (error: any) {
    logger.error('Mailbox status error', { ...requestLogMeta(req), error: error.message });
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

/**
 * @swagger
 * /mailbox/sync:
 *   post:
 *     summary: Sync recent emails
 *     description: Fetches the last 100 emails from Gmail and stores them in Supabase (permanent storage) and Redis (hot cache).
 *     tags: [Mailbox]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync successful
 */
mailboxRouter.post('/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    const { data: tokenData } = await supabase.from('user_tokens').select('*').eq('user_id', userId).single();
    if (!tokenData?.gmail_token) return res.status(400).json({ error: 'Tokens missing' });

    const gmail = getGmailClient(tokenData.gmail_token, tokenData.refresh_token);

    // 1. Calculate the 'after:' date filter for incremental sync
    let query = '';
    if (tokenData.last_sync_at) {
      const date = new Date(tokenData.last_sync_at);
      date.setDate(date.getDate() - 1);
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '/');
      query = `after:${dateStr}`;
    }

    // 2. Fetch messages since last sync (or last 100 if never sync'd)
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100
    });
    const messages = listRes.data.messages || [];

    const emailDataBatch = await Promise.all(
      messages.map(async (msg) => {
        if (!msg.id) return null;
        try {
          const detail = await gmail.users.messages.get({
            userId: 'me', id: msg.id, format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date', 'List-Unsubscribe']
          });
          const headers = detail.data.payload?.headers || [];
          const labels = detail.data.labelIds || [];
          const internalDate = detail.data.internalDate;

          return {
            message_id: msg.id,
            thread_id: msg.threadId || '',
            sender: headers.find(h => h.name?.toLowerCase() === 'from')?.value || 'Unknown',
            subject: headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)',
            snippet: detail.data.snippet || '',
            received_at: new Date(parseInt(internalDate || '0') || Date.now()).toISOString(),
            category: identifyCategory(headers, labels)
          };
        } catch { return null; }
      })
    );

    const validEmails = emailDataBatch.filter(e => e !== null) as any[];
    if (validEmails.length > 0) {
      const { saveEmails } = await import('../services/email.storage.service');
      await saveEmails(userId, validEmails);

      // Update last_sync_at in DB
      await supabase.from('user_tokens')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', userId);

      // Log the sync event
      await supabase.from('sync_log').insert({
        user_id: userId,
        emails_count: validEmails.length,
        status: 'success'
      });
    }

    res.json({ status: 'completed', count: validEmails.length });
  } catch (error: any) {
    logger.error('Sync error', { ...requestLogMeta(req), error: error.message });
    res.status(500).json({ error: 'Sync failed' });
  }
});

/**
 * @swagger
 * /mailbox/emails:
 *   get:
 *     summary: Get stored emails
 *     description: Returns the user's stored emails. Checks Redis cache first, then Supabase.
 *     tags: [Mailbox]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of emails
 */
mailboxRouter.get('/emails', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const categoriesStr = req.query.categories as string;
    const offset = (page - 1) * limit;

    const hasFilters = !!search || !!categoriesStr;

    // 1. Fetch from DB with pagination
    let query = supabase
      .from('emails')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (categoriesStr) {
      const categories = categoriesStr.split(',').filter(Boolean);
      if (categories.length > 0) {
        query = query.in('category', categories);
      }
    }

    if (search) {
      query = query.or(`subject.ilike.%${search}%,sender.ilike.%${search}%,snippet.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    const emails = data || [];

    res.json({
      emails,
      page,
      total: count,
      hasMore: (offset + emails.length) < (count || 0)
    });
  } catch (error: any) {
    logger.error('Get emails error', { ...requestLogMeta(req), error: error.message });
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

/**
 * Get distinct categories for the user
 */
mailboxRouter.get('/categories', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    const { data, error } = await supabase
      .from('emails')
      .select('category')
      .eq('user_id', userId)
      .neq('category', null);
      
    if (error) throw error;
    
    const uniqueCategories = [...new Set(data.map(d => d.category))].filter(Boolean);
    res.json({ categories: uniqueCategories });
  } catch (error: any) {
    logger.error('Get categories error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * Get distinct senders for the user (for auto-suggest)
 */
mailboxRouter.get('/senders', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    // Select distinct senders
    const { data, error } = await supabase
      .from('emails')
      .select('sender')
      .eq('user_id', userId)
      .neq('sender', null);
      
    if (error) throw error;
    
    // Parse pure emails from 'Name <email@domain>' bounds
    let uniqueSenders = [...new Set(data.map(d => {
        const match = d.sender.match(/<([^>]+)>/);
        return match ? match[1] : d.sender;
    }))].filter(Boolean);
    
    res.json({ senders: uniqueSenders });
  } catch (error: any) {
    logger.error('Get senders error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch senders' });
  }
});


/**
 * Get full email details including body
 */
mailboxRouter.get('/messages/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const messageId = req.params.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    // 1. Try to get from Database first
    const { data: dbEmail } = await supabase
      .from('emails')
      .select('*')
      .eq('user_id', userId)
      .eq('message_id', messageId)
      .single();

    if (dbEmail && dbEmail.body_plain) {
      logger.info('Serving email detail from database', { messageId });
      return res.json({
        message_id: dbEmail.message_id,
        thread_id: dbEmail.thread_id,
        sender: dbEmail.sender,
        subject: dbEmail.subject,
        received_at: dbEmail.received_at,
        body: dbEmail.body_plain,
        snippet: dbEmail.snippet,
        category: dbEmail.category
      });
    }

    // 2. Fallback to Gmail API if not in DB or body missing
    logger.info('Email not in DB or body missing, fetching from Gmail', { messageId });
    const { data: tokenData } = await supabase.from('user_tokens').select('*').eq('user_id', userId).single();
    if (!tokenData?.gmail_token) return res.status(400).json({ error: 'Tokens missing' });

    const gmail = getGmailClient(tokenData.gmail_token, tokenData.refresh_token);
    const detail: any = await gmail.users.messages.get({
      userId: 'me', id: messageId, format: 'full'
    } as any);

    // Parse body
    let body = '';
    const payload = detail.data.payload;
    if (payload?.parts) {
      const part = payload.parts.find((p: any) => p.mimeType === 'text/plain') || payload.parts[0];
      if (part?.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString();
      }
    } else if (payload?.body?.data) {
      body = Buffer.from(payload.body.data, 'base64').toString();
    }

    const headers = payload?.headers || [];
    const emailData = {
      message_id: detail.data.id as string,
      thread_id: detail.data.threadId as string,
      sender: headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value,
      subject: headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value,
      received_at: new Date(parseInt(detail.data.internalDate || '0')).toISOString(),
      body: body || detail.data.snippet || '',
      snippet: detail.data.snippet,
      labels: detail.data.labelIds
    };

    // 3. Optional: Sync back to DB so it's there next time
    await supabase.from('emails').upsert({
      user_id: userId,
      message_id: emailData.message_id,
      thread_id: emailData.thread_id,
      sender: emailData.sender,
      subject: emailData.subject,
      snippet: emailData.snippet,
      body_plain: emailData.body,
      received_at: emailData.received_at
    }, { onConflict: 'message_id' });

    res.json(emailData);
  } catch (error: any) {
    logger.error('Get email detail error', { message: error.message });
    res.status(500).json({ error: 'Failed to fetch email details' });
  }
});

/**
 * AI Analysis for a single email
 */
mailboxRouter.post('/messages/:id/analyze', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const messageId = req.params.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    // 1. Get email content (either from DB or Gmail)
    let { data: email } = await supabase
      .from('emails')
      .select('*')
      .eq('user_id', userId)
      .eq('message_id', messageId)
      .single();

    if (!email || !email.body_plain) {
      // Need to fetch and save first if not exists
      const { data: tokenData } = await supabase.from('user_tokens').select('*').eq('user_id', userId).single();
      const gmail = getGmailClient(tokenData.gmail_token, tokenData.refresh_token);
      const detail: any = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' } as any);

      let body = '';
      const payload = detail.data.payload;
      if (payload?.parts) {
        const part = payload.parts.find((p: any) => p.mimeType === 'text/plain') || payload.parts[0];
        if (part?.body?.data) body = Buffer.from(part.body.data, 'base64').toString();
      } else if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString();
      }

      const headers = payload?.headers || [];
      email = {
        user_id: userId,
        message_id: messageId,
        thread_id: detail.data.threadId,
        sender: headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value,
        subject: headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value,
        body_plain: body,
        snippet: detail.data.snippet,
        received_at: new Date(parseInt(detail.data.internalDate || '0')).toISOString()
      };
      await supabase.from('emails').upsert(email, { onConflict: 'message_id' });
    }

    // 2. Perform AI Analysis
    const analysis = await analyzeEmailWithAI({
      subject: email.subject || '',
      sender: email.sender || '',
      body: email.body_plain || ''
    });

    if (analysis) {
      await supabase.from('emails')
        .update({
          category: analysis.category,
          ai_metadata: analysis
        })
        .eq('message_id', messageId);

      res.json({ success: true, analysis });
    } else {
      res.status(500).json({ error: 'AI Analysis failed' });
    }
  } catch (error: any) {
    logger.error('Analyze email error', { error: error.message });
    res.status(500).json({ error: 'Failed to analyze email' });
  }
});

/**
 * @swagger
 * /mailbox/messages/{id}:
 *   delete:
 *     summary: Delete/Trash a specific message
 *     description: Moves the message to Gmail trash and removes it from Supabase storage.
 *     tags: [Mailbox]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted
 */
mailboxRouter.delete('/messages/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const messageId = req.params.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    const { data: tokenData } = await supabase.from('user_tokens').select('*').eq('user_id', userId).single();
    if (!tokenData?.gmail_token) {
      return res.status(400).json({ error: 'Google tokens not found.' });
    }

    const gmail = getGmailClient(tokenData.gmail_token, tokenData.refresh_token);

    // 1. Trash in Gmail
    await gmail.users.messages.trash({
      userId: 'me',
      id: messageId as string
    });

    // 2. Remove from Supabase
    await supabase.from('emails').delete().eq('message_id', messageId).eq('user_id', userId);

    res.json({ message: 'Success' });
  } catch (error: any) {
    logger.error('Delete message error', { ...requestLogMeta(req), error: error.message });
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

/**
 * Pause the historical background sync
 */
mailboxRouter.post('/historical/pause', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    await supabase.from('user_tokens')
      .update({ initial_sync_status: 'paused' })
      .eq('user_id', userId);

    res.json({ status: 'paused' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to pause scan' });
  }
});

/**
 * Resume the historical background sync
 */
mailboxRouter.post('/historical/resume', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    await supabase.from('user_tokens')
      .update({ initial_sync_status: 'in_progress' })
      .eq('user_id', userId);

    // Re-queue the job
    const { syncQueue } = await import('../config/bull');
    await syncQueue.add({ userId }, { removeOnComplete: true });

    res.json({ status: 'resumed' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to resume scan' });
  }
});

/**
 * Get unified audit logs (sync and cleanup)
 */
mailboxRouter.get('/audit-logs', requireAuth, requirePremium, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 10;

    if (!userId) return res.status(401).json({ error: 'User not found' });

    // Fetch Recent Sync Stats (Top 5)
    const { data: syncLogs } = await supabase
      .from('sync_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch Paginated Cleanup Logs
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: cleanupLogs, count } = await supabase
      .from('cleanup_log')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('action_taken_at', { ascending: false })
      .range(from, to);

    res.json({
      sync: syncLogs || [],
      cleanup: {
        data: cleanupLogs || [],
        total: count || 0,
        page,
        hasMore: (from + (cleanupLogs?.length || 0)) < (count || 0)
      }
    });
  } catch (error: any) {
    logger.error('Audit logs error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * Clear audit logs for the user
 */
mailboxRouter.delete('/audit-logs', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    // Delete from both log tables
    await supabase.from('cleanup_log').delete().eq('user_id', userId);
    await supabase.from('sync_log').delete().eq('user_id', userId);

    res.json({ success: true, message: 'Audit logs cleared successfully' });
  } catch (error: any) {
    logger.error('Clear audit logs error', { error: error.message });
    res.status(500).json({ error: 'Failed to clear audit logs' });
  }
});

/**
 * Generate a summary of today's most important emails
 */
mailboxRouter.post('/daily-brief', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch last 10 meaningful emails from the last 24 hours
    const { data: emails } = await supabase
      .from('emails')
      .select('*')
      .eq('user_id', userId)
      .gte('received_at', last24h)
      .not('category', 'in', '("otp", "newsletter", "promotions")')
      .order('received_at', { ascending: false })
      .limit(10);

    if (!emails || emails.length === 0) {
      return res.json({ summary: "No meaningful emails received in the last 24 hours." });
    }

    const emailText = emails.map(e => `Subject: ${e.subject}\nFrom: ${e.sender}\nBody: ${e.snippet}`).join('\n\n');

    const prompt = `
            Please provide a very brief, 2-3 sentence summary of these important emails from the last 24 hours. 
            Focus on cost updates, deliveries, payments, or personal requests. 
            Ignore newsletters or generic notifications.
            
            Emails:
            ${emailText}
        `;

    const { analyzeEmailWithAI } = await import('../services/email.analysis.service');
    const model = (await import('@google/generative-ai')).GoogleGenerativeAI;
    const genAI = new model(process.env.LLM_API_KEY || '');
    const aiModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const result = await aiModel.generateContent(prompt);
    const summary = result.response.text();

    res.json({ summary });
  } catch (error: any) {
    logger.error('Daily brief error', { error: error.message });
    res.status(500).json({ error: 'Failed to generate daily brief' });
  }
});
