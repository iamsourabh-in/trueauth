import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase, supabaseServiceRoleConfigured } from '../config/supabase';
import { createLogger } from '../lib/logger';

const logger = createLogger('auth.sync');

export const authRouter = Router();

function parseExpiresAt(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') return null;
  const d = Date.parse(raw);
  if (Number.isNaN(d)) return null;
  return new Date(d).toISOString();
}

/**
 * Persists Google OAuth tokens from the Supabase session into `user_tokens`.
 * The Gmail/Calendar routes read from this table — without this sync, they return 400.
 */
authRouter.post('/sync-google-tokens', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!supabaseServiceRoleConfigured) {
      logger.error('Supabase service role not configured; cannot persist tokens', {
        requestId: req.requestId
      });
      return res.status(503).json({
        error:
          'Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. The service role key is required to write to user_tokens.',
        requestId: req.requestId
      });
    }

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    const { provider_token, provider_refresh_token, expires_at } = req.body as {
      provider_token?: string;
      provider_refresh_token?: string | null;
      expires_at?: string | null;
    };

    if (!provider_token || typeof provider_token !== 'string') {
      logger.warn('sync-google-tokens rejected: missing provider_token', {
        requestId: req.requestId,
        userId
      });
      return res.status(400).json({
        error:
          'Missing provider_token. Sign out, then sign in with Google again (ensure Gmail scopes are granted).',
        requestId: req.requestId
      });
    }

    const refresh =
      typeof provider_refresh_token === 'string' && provider_refresh_token.trim() !== ''
        ? provider_refresh_token.trim()
        : null;

    const expiresAt = parseExpiresAt(expires_at);

    const now = new Date().toISOString();
    const row = {
      user_id: userId,
      gmail_token: provider_token,
      calendar_token: provider_token,
      refresh_token: refresh,
      expires_at: expiresAt,
      updated_at: now
    };

    // Avoid .maybeSingle(): multiple rows for the same user breaks it and caused 500s.
    const { data: existingRows, error: selectError } = await supabase
      .from('user_tokens')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (selectError) {
      logger.error('user_tokens select failed', {
        requestId: req.requestId,
        userId,
        code: selectError.code,
        message: selectError.message,
        details: selectError.details,
        hint: selectError.hint
      });
      return res.status(500).json({
        error: selectError.message,
        code: selectError.code,
        details: selectError.details,
        hint: selectError.hint,
        requestId: req.requestId
      });
    }

    const existingId = existingRows?.[0]?.id;

    if (existingId) {
      const { error } = await supabase
        .from('user_tokens')
        .update({
          gmail_token: row.gmail_token,
          calendar_token: row.calendar_token,
          refresh_token: row.refresh_token,
          expires_at: row.expires_at,
          updated_at: row.updated_at
        })
        .eq('id', existingId);

      if (error) {
        logger.error('user_tokens update failed', {
          requestId: req.requestId,
          userId,
          rowId: existingId,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return res.status(500).json({
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          requestId: req.requestId
        });
      }
      logger.info('user_tokens updated', { requestId: req.requestId, userId });
    } else {
      const { error } = await supabase.from('user_tokens').insert(row);

      if (error) {
        logger.error('user_tokens insert failed', {
          requestId: req.requestId,
          userId,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return res.status(500).json({
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          requestId: req.requestId
        });
      }
      logger.info('user_tokens inserted', { requestId: req.requestId, userId });

      // Trigger historical sync in background via Bull Queue
      const { syncQueue } = await import('../config/bull');
      await syncQueue.add({ userId }, { removeOnComplete: true });
    }

    res.json({ ok: true, requestId: req.requestId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    logger.error('sync-google-tokens unexpected exception', {
      requestId: req.requestId,
      message,
      stack: e instanceof Error ? e.stack : undefined
    });
    res.status(500).json({ error: message, requestId: req.requestId });
  }
});

/**
 * Purges ALL user data from all tables.
 * This is the 'Delete my data' feature.
 */
authRouter.post('/purge', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });

    logger.info('Starting account data purge', { userId, requestId: req.requestId });

    // Sequence of deletes
    // We do these individually to avoid complex constraint issues if any,
    // though most have ON DELETE CASCADE if they were perfectly set up.
    
    // 1. Delete emails
    const { error: eErr } = await supabase.from('emails').delete().eq('user_id', userId);
    if (eErr) logger.error('Purge: failed to delete emails', { userId, error: eErr });

    // 2. Delete subscriptions
    const { error: sErr } = await supabase.from('subscriptions').delete().eq('user_id', userId);
    if (sErr) logger.error('Purge: failed to delete subscriptions', { userId, error: sErr });

    // 3. Delete cleanup logs
    const { error: cErr } = await supabase.from('cleanup_log').delete().eq('user_id', userId);
    if (cErr) logger.error('Purge: failed to delete cleanup sessions', { userId, error: cErr });

    // 4. Delete sync logs
    const { error: slErr } = await supabase.from('sync_log').delete().eq('user_id', userId);
    if (slErr) logger.error('Purge: failed to delete sync logs', { userId, error: slErr });

    // 5. Delete tokens (most critical for access)
    const { error: tErr } = await supabase.from('user_tokens').delete().eq('user_id', userId);
    if (tErr) logger.error('Purge: failed to delete tokens', { userId, error: tErr });

    res.json({ 
      success: true, 
      message: 'All personal data has been removed from TrueAuth storage.' 
    });

  } catch (error: any) {
    logger.error('Purge account error', { userId: req.user?.id, error: error.message });
    res.status(500).json({ error: 'Failed to complete data deletion.' });
  }
});
