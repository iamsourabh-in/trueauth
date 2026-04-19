import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

interface Sub { 
  id: string;
  sender: string; 
  unsubscribe_link?: string; 
  status: string;
  created_at: string;
}

@Component({
  selector: 'app-subscriptions-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="subs-page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Digital Subscriptions</h2>
          <p class="page-sub">Discover and manage your active marketing emails.</p>
        </div>
        <button class="btn-primary" (click)="load(activeStatus, true)" [disabled]="loading">
          <lucide-icon name="refresh-cw" [size]="15" color="white" [class.spin]="loading"></lucide-icon>
          {{ loading ? 'Syncing...' : 'Sync Mailbox' }}
        </button>
      </div>

      <!-- Filters -->
      <div class="filter-tabs">
        <button 
          class="tab-btn" 
          [class.active]="activeStatus === 'active'"
          (click)="setStatus('active')"
        >
          Active <span>{{ activeCount }}</span>
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeStatus === 'unsubscribed'"
          (click)="setStatus('unsubscribed')"
        >
          Unsubscribed <span>{{ unsubCount }}</span>
        </button>
      </div>

      <!-- Loading skeleton -->
      <div class="subs-list" *ngIf="loading && !subs.length">
        <div class="sub-skeleton" *ngFor="let i of [1,2,3,4,5]"></div>
      </div>

      <!-- List -->
      <div class="subs-list" *ngIf="!loading || subs.length > 0">
        <div class="sub-row" *ngFor="let s of subs; let i = index" [style.animation-delay]="i * 40 + 'ms'">
          <div class="sub-avatar" [class.dimmed]="activeStatus === 'unsubscribed'">
            {{ displayName(s.sender).charAt(0).toUpperCase() }}
          </div>
          <div class="sub-info">
            <span class="sub-name">{{ displayName(s.sender) }}</span>
            <span class="sub-email">{{ senderEmail(s.sender) }}</span>
          </div>
          
          <div class="sub-actions">
            <a *ngIf="s.unsubscribe_link && activeStatus === 'active'" 
               [href]="extractLink(s.unsubscribe_link)" 
               target="_blank" 
               (click)="markUnsubscribed(s)"
               class="unsub-btn"
            >
              Unsubscribe
            </a>
            <div class="status-badge" *ngIf="activeStatus === 'unsubscribed'">
              <lucide-icon name="check-circle" [size]="14"></lucide-icon>
              Sent Request
            </div>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div class="empty-state" *ngIf="!loading && subs.length === 0">
        <lucide-icon name="shield-alert" [size]="40" color="currentColor" style="opacity:0.2"></lucide-icon>
        <h4>No {{ activeStatus }} subscriptions found</h4>
        <p>Run a sync to discover new marketing mailers from your inbox.</p>
      </div>
    </div>
  `,
  styles: [`
    .subs-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .page-title { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem; }
    .page-sub { font-size: 0.875rem; color: var(--text-secondary); }
    
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--accent); color: white; border: none; border-radius: 0.625rem; cursor: pointer; font-size: 0.875rem; font-weight: 600; padding: 0.65rem 1.25rem; transition: all 0.2s; }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.2); }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .filter-tabs { display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .tab-btn { background: none; border: none; padding: 0.5rem 1rem; color: var(--text-secondary); font-size: 0.875rem; font-weight: 600; cursor: pointer; border-radius: 0.5rem; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
    .tab-btn span { font-size: 0.7rem; background: var(--surface2); padding: 0.1rem 0.4rem; border-radius: 99px; }
    .tab-btn:hover { background: var(--surface2); color: var(--text-primary); }
    .tab-btn.active { color: var(--accent); background: var(--accent-subtle); }
    .tab-btn.active span { background: var(--accent); color: white; }

    .subs-list { display: flex; flex-direction: column; gap: 0.6rem; }
    .sub-skeleton { height: 68px; background: var(--surface2); border-radius: 0.875rem; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

    .sub-row { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; animation: fadeSlideUp 0.3s ease both; transition: all 0.2s; }
    @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    .sub-row:hover { border-color: var(--accent); box-shadow: var(--card-shadow); }
    
    .sub-avatar { width: 38px; height: 38px; border-radius: 0.625rem; background: linear-gradient(135deg, var(--accent), var(--accent2)); color: white; font-weight: 700; font-size: 1rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .sub-avatar.dimmed { filter: grayscale(1); opacity: 0.5; }
    
    .sub-info { flex: 1; min-width: 0; }
    .sub-name { display: block; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.1rem; }
    .sub-email { display: block; font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    
    .sub-actions { flex-shrink: 0; }
    .unsub-btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.45rem 1rem; border-radius: 0.5rem; background: rgba(239,68,68,0.08); color: var(--danger); font-size: 0.85rem; font-weight: 700; text-decoration: none; border: 1px solid rgba(239,68,68,0.15); transition: all 0.15s; }
    .unsub-btn:hover { background: var(--danger); color: white; border-color: var(--danger); }
    
    .status-badge { display: flex; align-items: center; gap: 0.4rem; color: var(--success); font-size: 0.78rem; font-weight: 700; background: rgba(34,197,94,0.1); padding: 0.35rem 0.75rem; border-radius: 0.5rem; }

    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.8rem; padding: 5rem 2rem; color: var(--text-secondary); text-align: center; }
    .empty-state h4 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
  `]
})
export class SubscriptionsPageComponent implements OnInit {
  api = inject(ApiService);
  loading = true;
  subs: Sub[] = [];
  activeStatus = 'active';
  activeCount = 0;
  unsubCount = 0;

  async ngOnInit() { 
    await this.load();
    this.updateStats();
  }

  async setStatus(status: string) {
    this.activeStatus = status;
    await this.load();
  }

  async load(status = this.activeStatus, forceRefresh = false) {
    this.loading = true;
    try {
      const res = await this.api.getSubscriptions(status);
      this.subs = res.subscriptions ?? [];
      // If we sync'd, we should update the total counts
      if (forceRefresh) this.updateStats();
    } catch { 
      this.subs = []; 
    } finally { 
      this.loading = false; 
    }
  }

  async updateStats() {
    try {
        const [active, unsub] = await Promise.all([
            this.api.getSubscriptions('active'),
            this.api.getSubscriptions('unsubscribed')
        ]);
        this.activeCount = active.subscriptions?.length || 0;
        this.unsubCount = unsub.subscriptions?.length || 0;
    } catch {}
  }

  async markUnsubscribed(sub: Sub) {
    // Optimistic UI update
    this.subs = this.subs.filter(s => s.id !== sub.id);
    this.activeCount--;
    this.unsubCount++;
    try {
        await this.api.markAsUnsubscribed(sub.id);
    } catch (e) {
        // Rollback
        await this.load();
    }
  }

  extractLink(raw: string): string {
    // List-Unsubscribe can be <mailto:xxx> or <http://xxx>
    const match = raw.match(/<(https?:\/\/[^>]+)>/);
    if (match) return match[1];
    // Fallback to the mailto link if no http found, or just return raw if it's already a link
    const mailto = raw.match(/<(mailto:[^>]+)>/);
    if (mailto) return mailto[1];
    return raw.replace(/[<>]/g, '').split(',')[0].trim();
  }

  displayName(raw: string) {
    if (!raw) return 'Unknown';
    const i = raw.indexOf('<');
    return i === -1 ? raw : raw.slice(0, i).trim() || raw;
  }

  senderEmail(raw: string) {
    if (!raw) return '';
    const m = raw.match(/<(.+)>/);
    return m ? m[1] : raw;
  }
}
