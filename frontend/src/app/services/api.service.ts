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

  // The backend base URL - sourced from environment config
  baseUrl = environment.apiUrl;

  async getHeaders() {
    const token = await this.supabase.sessionToken;
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  async syncGoogleTokensFromSession(): Promise<void> {
    const session = await this.supabase.getSession();
    if (!session?.provider_token) return;
    const headers = await this.getHeaders();
    const expiresAt = session.expires_at != null ? new Date(session.expires_at * 1000).toISOString() : null;
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/auth/sync-google-tokens`, {
        provider_token: session.provider_token,
        provider_refresh_token: session.provider_refresh_token ?? null,
        expires_at: expiresAt
      }, { headers }));
    } catch (error) { throw error; }
  }

  async getMailboxStatus() {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/mailbox/status`, { headers }));
  }

  async getSubscriptions(status: string = 'active') {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/subscriptions?status=${status}`, { headers }));
  }

  async markAsUnsubscribed(id: string) {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/subscriptions/unsubscribe`, { id }, { headers }));
  }

  async triggerCleanup(action: string) {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/cleanup/trigger`, { action }, { headers }));
  }

  async generateDraft(threadId: string) {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/draft/reply`, { threadId }, { headers }));
  }

  async suggestCalendarEvent(emailContent: string) {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/calendar/suggest`, { emailContent }, { headers }));
  }

  async createCalendarEvent(event: { title?: string; start?: string; end?: string }) {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/calendar/create`, event, { headers }));
  }

  async getMessageDetail(id: string) {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/mailbox/messages/${id}`, { headers }));
  }

  async getCalendarEvents() {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any[]>(`${this.baseUrl}/calendar/events`, { headers }));
  }

  async getDailyBrief() {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/mailbox/daily-brief`, {}, { headers }));
  }

  async getAuditLogs(page: number = 1) {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/mailbox/audit-logs?page=${page}`, { headers }));
  }

  async clearAuditLogs() {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.delete<any>(`${this.baseUrl}/mailbox/audit-logs`, { headers }));
  }

  async analyzeMessage(id: string) {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/mailbox/messages/${id}/analyze`, {}, { headers }));
  }

  async syncMailbox() {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/mailbox/sync`, {}, { headers }));
  }

  async getEmails(page: number = 1, limit: number = 50) {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/mailbox/emails?page=${page}&limit=${limit}`, { headers }));
  }

  async deleteMessage(messageId: string) {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.delete<any>(`${this.baseUrl}/mailbox/messages/${messageId}`, { headers }));
  }

  async purgeData() {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/auth/purge`, {}, { headers }));
  }

  async pauseHistoricalSync() {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/mailbox/historical/pause`, {}, { headers }));
  }

  async resumeHistoricalSync() {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/mailbox/historical/resume`, {}, { headers }));
  }
}
