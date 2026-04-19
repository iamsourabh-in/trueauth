import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { extractCalendarDetails } from '../services/ai.service';
import { getCalendarClient } from '../config/google';

export const calendarRouter = Router();

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

// Assuming a separate endpoint where the user confirms creation
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
    } catch (error: any) {
        console.error('Calendar create error:', error);
        res.status(500).json({ error: 'Failed to create calendar event', details: error.message });
    }
});
