import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-email-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="email-page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Inbox</h2>
          <p class="page-sub">Ingested emails for AI analysis and organization.</p>
        </div>
        <button class="btn-primary" (click)="sync()" [disabled]="syncing">
          <lucide-icon name="refresh-cw" [size]="15" [class.spin]="syncing"></lucide-icon>
          {{ syncing ? 'Syncing...' : 'Sync Now' }}
        </button>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading && !emails.length">
        <div class="skeleton-row" *ngFor="let i of [1,2,3,4,5,6]"></div>
      </div>

      <!-- Email List -->
      <div class="email-list" *ngIf="!loading || emails.length > 0">
        <div class="email-item" *ngFor="let email of emails; let i = index" [style.animation-delay]="i * 20 + 'ms'">
          <div class="email-avatar">{{ email.sender.charAt(0).toUpperCase() }}</div>
          <div class="email-main">
            <div class="email-top">
              <span class="email-sender">{{ email.sender }}</span>
              <span class="email-date">{{ email.received_at | date:'MMM d' }}</span>
            </div>
            <div class="email-subject">{{ email.subject }}</div>
            <div class="email-snippet">{{ email.snippet }}</div>
          </div>
        </div>

        <div class="empty-state" *ngIf="!loading && emails.length === 0">
          <lucide-icon name="mail" [size]="40" style="opacity: 0.2"></lucide-icon>
          <h3>No emails synced</h3>
          <p>Click "Sync Now" to ingest your recent emails from Gmail.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .email-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .page-title { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem; }
    .page-sub { font-size: 0.875rem; color: var(--text-secondary); }
    
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--accent); color: white; border: none; border-radius: 0.625rem; cursor: pointer; font-size: 0.875rem; font-weight: 600; padding: 0.65rem 1.25rem; transition: all 0.2s; }
    .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
    
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .skeleton-row { height: 80px; background: var(--surface2); border-radius: 0.75rem; margin-bottom: 0.75rem; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

    .email-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .email-item { display: flex; gap: 1rem; padding: 1.1rem; background: var(--surface); border: 1px solid var(--border); border-radius: 0.875rem; cursor: pointer; transition: all 0.2s; animation: slideUp 0.3s ease both; }
    .email-item:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: var(--card-shadow); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .email-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--accent-subtle); color: var(--accent); display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
    .email-main { flex: 1; min-width: 0; }
    .email-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; }
    .email-sender { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); }
    .email-date { font-size: 0.75rem; color: var(--text-secondary); }
    .email-subject { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .email-snippet { font-size: 0.85rem; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }

    .empty-state { padding: 4rem 2rem; text-align: center; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  `]
})
export class EmailListComponent implements OnInit {
  api = inject(ApiService);
  loading = true;
  syncing = false;
  emails: any[] = [];

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading = true;
    try {
      const res = await this.api.getEmails();
      this.emails = res.emails || [];
    } catch { }
    finally { this.loading = false; }
  }

  async sync() {
    this.syncing = true;
    try {
      await this.api.syncMailbox();
      await this.load();
    } catch { }
    finally { this.syncing = false; }
  }
}
