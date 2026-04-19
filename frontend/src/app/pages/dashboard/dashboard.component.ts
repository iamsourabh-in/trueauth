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
  template: `
    <div class="min-h-screen bg-[#f0f2f5] text-[#202124] flex flex-col md:flex-row">
      <aside
        class="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-[#dadce0] flex md:flex-col shrink-0"
      >
        <div class="px-4 py-4 border-b border-[#dadce0] md:border-b-0">
          <h2 class="text-lg font-medium text-[#202124] tracking-tight">TrueAuth</h2>
          <p class="text-xs text-[#5f6368] truncate mt-0.5" *ngIf="email">{{ email }}</p>
        </div>
        <nav class="flex md:flex-col gap-0.5 p-2 flex-1 overflow-x-auto md:overflow-visible">
          <span
            class="block px-3 py-2 rounded-md text-sm font-medium bg-[#e8f0fe] text-[#1967d2] whitespace-nowrap"
          >
            Inbox overview
          </span>
          <span
            class="block px-3 py-2 rounded-md text-sm text-[#5f6368] whitespace-nowrap cursor-default"
          >
            Subscriptions
          </span>
          <span
            class="block px-3 py-2 rounded-md text-sm text-[#5f6368] whitespace-nowrap cursor-default"
          >
            Rules log
          </span>
        </nav>
        <div class="p-2 border-t border-[#dadce0]">
          <button
            type="button"
            (click)="signOut()"
            class="w-full text-left px-3 py-2 text-sm text-[#5f6368] hover:bg-[#f1f3f4] rounded-md transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main class="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
        <header class="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 class="text-[22px] font-normal text-[#202124] leading-tight">Welcome</h1>
            <p class="text-sm text-[#5f6368] mt-1">Mailbox status and quick actions.</p>
          </div>
          <button
            type="button"
            (click)="refreshMailbox()"
            class="inline-flex items-center justify-center px-4 py-2 rounded text-sm font-medium bg-[#1a73e8] text-white hover:bg-[#1557b0] focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-2 shadow-sm transition-colors"
          >
            Scan mailbox
          </button>
        </header>

        <p *ngIf="statusError" class="mb-4 text-sm text-[#c5221f] bg-[#fce8e6] border border-[#fad2cf] rounded-md px-3 py-2">
          {{ statusError }}
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div class="bg-white rounded-lg border border-[#dadce0] p-4 shadow-sm">
            <p class="text-xs font-medium uppercase tracking-wide text-[#5f6368] mb-1">Emails scanned</p>
            <p class="text-2xl font-normal text-[#202124]">{{ stats?.totalEmailsScanned ?? '—' }}</p>
          </div>
          <div class="bg-white rounded-lg border border-[#dadce0] p-4 shadow-sm">
            <p class="text-xs font-medium uppercase tracking-wide text-[#5f6368] mb-1">Unread</p>
            <p class="text-2xl font-normal text-[#202124]">{{ stats?.unreadCount ?? '—' }}</p>
          </div>
          <div class="bg-white rounded-lg border border-[#dadce0] p-4 shadow-sm">
            <p class="text-xs font-medium uppercase tracking-wide text-[#5f6368] mb-1">Risk signals</p>
            <p class="text-2xl font-normal text-[#c5221f]">{{ stats?.riskSignals ?? '—' }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-lg border border-[#dadce0] p-4 md:p-6 shadow-sm">
            <h3 class="text-base font-medium text-[#202124] mb-4">Quick cleanup</h3>
            <div class="space-y-3">
              <div
                class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-md border border-[#dadce0] hover:bg-[#f8f9fa] transition-colors"
              >
                <div>
                  <h4 class="text-sm font-medium text-[#202124]">Archive promotions</h4>
                  <p class="text-xs text-[#5f6368] mt-0.5">Move promotional mail out of the inbox</p>
                </div>
                <button
                  type="button"
                  (click)="triggerAction('archive-promotions')"
                  class="shrink-0 text-sm font-medium text-[#1a73e8] hover:underline"
                >
                  Run
                </button>
              </div>
              <div
                class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-md border border-[#dadce0] hover:bg-[#f8f9fa] transition-colors"
              >
                <div>
                  <h4 class="text-sm font-medium text-[#202124]">Delete OTPs</h4>
                  <p class="text-xs text-[#5f6368] mt-0.5">Remove older verification codes</p>
                </div>
                <button
                  type="button"
                  (click)="triggerAction('delete-otps')"
                  class="shrink-0 text-sm font-medium text-[#1a73e8] hover:underline"
                >
                  Run
                </button>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg border border-[#dadce0] p-4 md:p-6 shadow-sm">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-base font-medium text-[#202124]">Top subscriptions</h3>
              <button
                type="button"
                (click)="loadSubs()"
                class="text-sm font-medium text-[#1a73e8] hover:underline"
              >
                Refresh
              </button>
            </div>

            <div class="space-y-0" *ngIf="subs.length > 0">
              <div
                *ngFor="let s of subs"
                class="flex items-center justify-between gap-2 py-3 border-b border-[#f1f3f4] last:border-0"
              >
                <span class="text-sm text-[#202124] truncate min-w-0">{{ displaySender(s.sender) }}</span>
                <a
                  *ngIf="s.unsubscribeLink"
                  [href]="s.unsubscribeLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-[#1a73e8] shrink-0 hover:underline"
                >
                  Unsubscribe
                </a>
              </div>
            </div>
            <div *ngIf="subs.length === 0" class="text-center py-8 text-sm text-[#5f6368]">
              No subscriptions loaded yet. Connect the API and refresh.
            </div>
          </div>
        </div>
      </main>
    </div>
  `
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
