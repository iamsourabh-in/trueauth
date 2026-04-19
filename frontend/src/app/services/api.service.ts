import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SupabaseService } from './supabase.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  http = inject(HttpClient);
  supabase = inject(SupabaseService);

  // The backend base URL - must include /api
  baseUrl = 'http://localhost:3000/api';

  async getHeaders() {
    const token = await this.supabase.sessionToken;
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  /**
   * Saves Google provider tokens from the Supabase session into `user_tokens` (server-side).
   * Required before mailbox/subscriptions APIs can call Gmail.
   */
  async syncGoogleTokensFromSession(): Promise<void> {
    const session = await this.supabase.getSession();
    if (!session?.provider_token) {
      return;
    }
    const headers = await this.getHeaders();
    const expiresAt =
      session.expires_at != null ? new Date(session.expires_at * 1000).toISOString() : null;
    
    console.info('[API] POST /auth/sync-google-tokens');
    try {
      await firstValueFrom(
        this.http.post(
          `${this.baseUrl}/auth/sync-google-tokens`,
          {
            provider_token: session.provider_token,
            provider_refresh_token: session.provider_refresh_token ?? null,
            expires_at: expiresAt
          },
          { headers }
        )
      );
      console.info('[API] POST /auth/sync-google-tokens - Success');
    } catch (error) {
      console.error('[API] POST /auth/sync-google-tokens - Failed', error);
      throw error;
    }
  }

  async getMailboxStatus() {
    console.info('[API] GET /mailbox/status');
    const headers = await this.getHeaders();
    try {
      const res = await firstValueFrom(this.http.get<any>(`${this.baseUrl}/mailbox/status`, { headers }));
      console.info('[API] GET /mailbox/status - Success', res);
      return res;
    } catch (error) {
      console.error('[API] GET /mailbox/status - Failed', error);
      throw error;
    }
  }

  async getSubscriptions(forceRefresh = false) {
    const url = forceRefresh ? `${this.baseUrl}/subscriptions?refresh=true` : `${this.baseUrl}/subscriptions`;
    console.info(`[API] GET ${url}`);
    const headers = await this.getHeaders();
    try {
      const res = await firstValueFrom(this.http.get<any>(url, { headers }));
      console.info(`[API] GET ${url} - Success`, res);
      return res;
    } catch (error) {
      console.error(`[API] GET ${url} - Failed`, error);
      throw error;
    }
  }

  async triggerCleanup(action: string) {
    console.info(`[API] POST /cleanup/trigger payload: ${action}`);
    const headers = await this.getHeaders();
    try {
      const res = await firstValueFrom(this.http.post<any>(`${this.baseUrl}/cleanup/trigger`, { action }, { headers }));
      console.info(`[API] POST /cleanup/trigger - Success for ${action}`, res);
      return res;
    } catch (error) {
      console.error(`[API] POST /cleanup/trigger - Failed for ${action}`, error);
      throw error;
    }
  }

  async generateDraft(threadId: string) {
    console.info('[API] POST /draft/reply');
    const headers = await this.getHeaders();
    try {
      const res = await firstValueFrom(this.http.post<any>(`${this.baseUrl}/draft/reply`, { threadId }, { headers }));
      console.info('[API] POST /draft/reply - Success', res);
      return res;
    } catch (error) {
      console.error('[API] POST /draft/reply - Failed', error);
      throw error;
    }
  }

  async suggestCalendarEvent(emailContent: string) {
    console.info('[API] POST /calendar/suggest');
    const headers = await this.getHeaders();
    try {
      const res = await firstValueFrom(this.http.post<any>(`${this.baseUrl}/calendar/suggest`, { emailContent }, { headers }));
      console.info('[API] POST /calendar/suggest - Success', res);
      return res;
    } catch (error) {
      console.error('[API] POST /calendar/suggest - Failed', error);
      throw error;
    }
  }

  async createCalendarEvent(event: { title?: string; start?: string; end?: string }) {
    console.info('[API] POST /calendar/create');
    const headers = await this.getHeaders();
    try {
      const res = await firstValueFrom(this.http.post<any>(`${this.baseUrl}/calendar/create`, event, { headers }));
      console.info('[API] POST /calendar/create - Success', res);
      return res;
    } catch (error) {
      console.error('[API] POST /calendar/create - Failed', error);
      throw error;
    }
  }
}
