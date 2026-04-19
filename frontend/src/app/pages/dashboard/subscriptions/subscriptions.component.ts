import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

interface Sub { sender: string; unsubscribeLink?: string; }

@Component({
  selector: 'app-subscriptions-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="subs-page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Your Subscriptions</h2>
          <p class="page-sub">AI-detected marketing subscriptions with one-click unsubscribe.</p>
        </div>
        <button class="btn-primary" (click)="load()" [disabled]="loading">
          <lucide-icon name="refresh-cw" [size]="15" color="white"></lucide-icon>
          {{ loading ? 'Scanning…' : 'Refresh' }}
        </button>
      </div>

      <!-- Count badge -->
      <div class="count-badge" *ngIf="subs.length > 0">
        <lucide-icon name="bell" [size]="14"></lucide-icon>
        {{ subs.length }} active subscriptions found
      </div>

      <!-- Loading skeleton -->
      <div class="subs-list" *ngIf="loading">
        <div class="sub-skeleton" *ngFor="let i of [1,2,3,4,5]"></div>
      </div>

      <!-- List -->
      <div class="subs-list" *ngIf="!loading && subs.length > 0">
        <div class="sub-row" *ngFor="let s of subs; let i = index" [style.animation-delay]="i * 40 + 'ms'">
          <div class="sub-avatar">{{ displayName(s.sender).charAt(0).toUpperCase() }}</div>
          <div class="sub-info">
            <span class="sub-name">{{ displayName(s.sender) }}</span>
            <span class="sub-email">{{ senderEmail(s.sender) }}</span>
          </div>
          <a *ngIf="s.unsubscribeLink" [href]="s.unsubscribeLink" target="_blank" rel="noopener" class="unsub-btn">
            Unsubscribe
          </a>
        </div>
      </div>

      <!-- Empty -->
      <div class="empty-state" *ngIf="!loading && subs.length === 0">
        <lucide-icon name="bell" [size]="40" color="currentColor" style="opacity:0.3"></lucide-icon>
        <h4>No subscriptions found</h4>
        <p>Click Refresh to scan your Gmail for subscription emails.</p>
      </div>
    </div>
  `,
  styles: [`
    .subs-page { display: flex; flex-direction: column; gap: 1.25rem; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .page-title { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem; }
    .page-sub { font-size: 0.875rem; color: var(--text-secondary); }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--accent); color: white; border: none; border-radius: 0.625rem; cursor: pointer; font-size: 0.875rem; font-weight: 600; padding: 0.65rem 1.25rem; transition: all 0.2s; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.6; pointer-events: none; }
    .count-badge { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.85rem; background: var(--accent-subtle); color: var(--accent); border-radius: 99px; font-size: 0.78rem; font-weight: 600; border: 1px solid rgba(99,102,241,0.15); width: fit-content; }
    .subs-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .sub-skeleton { height: 64px; background: linear-gradient(90deg, var(--surface2) 25%, var(--border) 50%, var(--surface2) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 0.75rem; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .sub-row { display: flex; align-items: center; gap: 1rem; padding: 0.9rem 1.1rem; background: var(--surface); border: 1px solid var(--border); border-radius: 0.875rem; animation: fadeSlideUp 0.3s ease both; transition: box-shadow 0.2s; }
    @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .sub-row:hover { box-shadow: var(--card-shadow); }
    .sub-avatar { width: 36px; height: 36px; border-radius: 0.5rem; background: linear-gradient(135deg, var(--accent), var(--accent2)); color: white; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .sub-info { flex: 1; min-width: 0; }
    .sub-name { display: block; font-size: 0.9rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sub-email { display: block; font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .unsub-btn { flex-shrink: 0; padding: 0.4rem 0.9rem; border-radius: 0.5rem; background: rgba(239,68,68,0.08); color: var(--danger); font-size: 0.8rem; font-weight: 600; text-decoration: none; border: 1px solid rgba(239,68,68,0.15); transition: all 0.15s; }
    .unsub-btn:hover { background: rgba(239,68,68,0.15); }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; padding: 4rem 2rem; color: var(--text-secondary); text-align: center; }
    .empty-state h4 { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
    .empty-state p { font-size: 0.875rem; }
  `]
})
export class SubscriptionsPageComponent implements OnInit {
  api = inject(ApiService);
  loading = true;
  subs: Sub[] = [];

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading = true;
    try {
      const res = await this.api.getSubscriptions();
      this.subs = res.subscriptions ?? [];
    } catch { this.subs = []; }
    finally { this.loading = false; }
  }

  displayName(raw: string) {
    const i = raw.indexOf('<');
    return i === -1 ? raw : raw.slice(0, i).trim() || raw;
  }
  senderEmail(raw: string) {
    const m = raw.match(/<(.+)>/);
    return m ? m[1] : '';
  }
}
