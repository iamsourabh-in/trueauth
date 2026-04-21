import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  api = inject(ApiService);
  router = inject(Router);
  supabase = inject(SupabaseService);
  private destroyRef = inject(DestroyRef);

  stats: { totalEmailsScanned?: number; unreadCount?: number; riskSignals?: number } | null = null;
  subs: { sender: string; unsubscribeLink?: string }[] = [];
  statusError: string | null = null;
  email: string | null = null;

  ngOnInit() {
    this.supabase.user.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((u) => {
      this.email = u?.email ?? u?.user_metadata?.['email'] ?? null;
    });
    void this.bootstrapDashboard();
  }

  /** Persists Google OAuth tokens from Supabase session into DB, then loads data. */
  private async bootstrapDashboard() {
    try {
      await this.api.syncGoogleTokensFromSession();
    } catch (e: unknown) {
      console.warn('Google token sync failed', e);
    }
    await this.loadStatus();
    await this.loadSubs();
  }

  displaySender(raw: string): string {
    const i = raw.indexOf('<');
    return i === -1 ? raw : raw.slice(0, i).trim();
  }

  async loadStatus() {
    this.statusError = null;
    try {
      this.stats = await this.api.getMailboxStatus();
    } catch (e: unknown) {
      const http = e as { status?: number; error?: { error?: string }; message?: string };
      const msg =
        http?.error?.error ??
        http?.error ??
        http?.message ??
        (typeof http?.status === 'number' ? `Request failed (${http.status})` : 'Could not load mailbox status.');
      const text = String(msg);
      if (http?.status === 400 && text.toLowerCase().includes('google')) {
        this.statusError =
          'Gmail tokens are not stored yet. Sign out, sign in with Google again, approve Gmail access, then refresh this page.';
        return;
      }
      if (http?.status === 401 || text.toLowerCase().includes('token')) {
        this.statusError =
          'API rejected the session. Ensure the backend is running and you are signed in with Google.';
        return;
      }
      this.statusError = text;
    }
  }

  async loadSubs() {
    try {
      const res = await this.api.getSubscriptions();
      this.subs = res.subscriptions || [];
    } catch {
      this.subs = [];
    }
  }

  async refreshMailbox() {
    try {
      await this.api.syncGoogleTokensFromSession();
    } catch {
      /* sync is best-effort */
    }
    await this.loadStatus();
    await this.loadSubs();
  }

  async triggerAction(action: string) {
    try {
      await this.api.triggerCleanup(action);
      window.alert(`Started: ${action}`);
    } catch {
      window.alert('Action failed. Check the API and try again.');
    }
  }

  async signOut() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
