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
      'Authorization': `Bearer ${token}`
    });
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
