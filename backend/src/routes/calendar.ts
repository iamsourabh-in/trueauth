import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { extractCalendarDetails } from '../services/ai.service';
import { getCalendarClient } from '../config/google';
import { createLogger, requestLogMeta } from '../lib/logger';

const logger = createLogger('routes.calendar');

export const calendarRouter = Router();

/**
 * @swagger
 * /calendar/suggest:
 *   post:
 *     summary: Parse email body for Calendar Suggestion
 *     description: Leverages LLM to extract potential meeting names and time spans from raw email body strings.
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailContent:
 *                 type: string
 *     responses:
 *       200:
 *         description: Suggestion extracted
 *       400:
 *         description: Content or token missing 
 */
calendarRouter.post('/suggest', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { emailContent } = req.body;
    
    if (!userId) return res.status(401).json({ error: 'User not found' });
    if (!emailContent) return res.status(400).json({ error: 'Missing email content/snippet' });

    const { data: tokenData } = await supabase.from('user_tokens').select('*').eq('user_id', userId).single();
    if (!tokenData?.calendar_token) return res.status(400).json({ error: 'Calendar token not found.' });

    // 1. Extract Details
    const details = await extractCalendarDetails(emailContent);
    // details should be { title, start, end }

    // 2. Suggest back to user or create directly?
    // README: "Return suggested event to frontend. User confirms, then create via Google Calendar API."
    // So we just return the suggestion.
    res.json({ suggestion: details });
  } catch (error: any) {
    console.error('Calendar suggest error:', error);
    res.status(500).json({ error: 'Failed to extract calendar details', details: error.message });
  }
});

/**
 * @swagger
 * /calendar/create:
 *   post:
 *     summary: Generate Event inside Google Calendar
 *     description: Formats an event object and inserts it directly into the user's primary calendar stream.
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               start:
 *                 type: string
 *                 format: date-time
 *               end:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Created Google Calendar Event HTML link
 *       500:
 *         description: API insertion issues
 */
calendarRouter.post('/create', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        const { title, start, end } = req.body;
        
        const { data: tokenData } = await supabase.from('user_tokens').select('*').eq('user_id', userId).single();
        const calendar = getCalendarClient(tokenData.calendar_token, tokenData.refresh_token);

        const event = {
            summary: title,
            start: { dateTime: start },
            end: { dateTime: end }
        };

        const createRes = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event
        });

        res.json({ eventUrl: createRes.data.htmlLink });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Calendar create error', {
          ...requestLogMeta(req),
          message,
          stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({
          error: 'Failed to create calendar event',
          details: message,
          requestId: req.requestId
        });
    }
});
/**
 * Get upcoming events for the month
 */
calendarRouter.get('/events', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        const { data: tokenData } = await supabase.from('user_tokens').select('*').eq('user_id', userId).single();
        if (!tokenData?.calendar_token) return res.status(400).json({ error: 'Auth required' });

        const calendar = getCalendarClient(tokenData.calendar_token, tokenData.refresh_token);
        
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: now.toISOString(),
            timeMax: endOfMonth.toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        });

        res.json(response.data.items || []);
    } catch (error: any) {
        logger.error('Fetch calendar events error', { userId: req.user?.id, error: error.message });
        res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
});
