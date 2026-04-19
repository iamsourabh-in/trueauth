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

  // The backend base URL
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
  }

  async getMailboxStatus() {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/mailbox/status`, { headers }));
  }

  async getSubscriptions() {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/subscriptions`, { headers }));
  }

  async triggerCleanup(action: string) {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/cleanup/trigger`, { action }, { headers }));
  }
}
