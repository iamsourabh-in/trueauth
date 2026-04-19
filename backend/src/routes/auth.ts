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
