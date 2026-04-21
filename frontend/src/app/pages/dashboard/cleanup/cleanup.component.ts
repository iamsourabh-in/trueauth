import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

interface Rule { id: string; label: string; desc: string; action: string; icon: string; color: string; }

@Component({
  selector: 'app-cleanup-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="cleanup-page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Cleanup Rules</h2>
          <p class="page-sub">Run background jobs to auto-archive or delete unwanted mail.</p>
        </div>
      </div>

      <div class="rules-grid">
        <div class="rule-card" *ngFor="let r of rules">
          <div class="rule-icon" [style.background]="r.color">
             <lucide-icon [name]="r.icon" [size]="20" color="white"></lucide-icon>
          </div>
          <div class="rule-body">
            <h3 class="rule-name">{{ r.label }}</h3>
            <p class="rule-desc">{{ r.desc }}</p>
          </div>
          <button
            class="run-btn"
            [class.running]="running === r.action"
            [class.done]="done.has(r.action)"
            (click)="run(r)"
            [disabled]="running !== null"
          >
            <span *ngIf="running === r.action" class="mini-spinner"></span>
            <span *ngIf="done.has(r.action)">✓ Done</span>
            <span *ngIf="running !== r.action && !done.has(r.action)">Run</span>
          </button>
        </div>
      </div>

      <!-- Bulk Delete -->
      <div class="bulk-delete-section">
        <div class="rule-card bulk-card">
          <div class="rule-icon" style="background: linear-gradient(135deg, #ec4899, #f43f5e)">
             <lucide-icon name="trash-2" [size]="20" color="white"></lucide-icon>
          </div>
          <div class="rule-body">
            <h3 class="rule-name">Custom Bulk Delete</h3>
            <p class="rule-desc">Permanently remove all emails matching a specific Gmail search query.</p>
            <div class="bulk-input-row">
               <input type="text" placeholder="e.g. from:spam@example.com or older_than:30d" class="form-input" [value]="bulkQuery" (input)="onBulkInput($event)">
               <button 
                 class="run-btn danger" 
                 [class.running]="running === 'bulk-delete'"
                 [disabled]="!bulkQuery || running !== null"
                 (click)="runBulk()"
               >
                 <span *ngIf="running === 'bulk-delete'" class="mini-spinner"></span>
                 <span *ngIf="running !== 'bulk-delete'">Run Delete</span>
               </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Log -->
      <div class="log-section" *ngIf="log.length > 0">
        <h3 class="log-title">Activity log</h3>
        <div class="log-list">
          <div class="log-row" *ngFor="let l of log">
            <span class="log-dot" [class.success]="l.ok" [class.fail]="!l.ok"></span>
            <span class="log-time">{{ l.time | date:'HH:mm:ss' }}</span>
            <span class="log-msg">{{ l.msg }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cleanup-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .page-title { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem; }
    .page-sub { font-size: 0.875rem; color: var(--text-secondary); }
    .rules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .rule-card { background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; padding: 1.25rem; display: flex; align-items: center; gap: 1rem; transition: box-shadow 0.2s, transform 0.2s; }
    .rule-card:hover { box-shadow: var(--card-shadow); transform: translateY(-2px); }
    .rule-icon { width: 44px; height: 44px; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rule-body { flex: 1; min-width: 0; }
    .rule-name { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.2rem; }
    .rule-desc { font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4; }
    .run-btn { flex-shrink: 0; padding: 0.45rem 1rem; border-radius: 0.5rem; border: 1px solid var(--border); background: var(--surface2); color: var(--text-primary); font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.2s; min-width: 56px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 0.4rem; }
    .run-btn:hover:not(:disabled) { background: var(--accent); color: white; border-color: var(--accent); }
    .run-btn:disabled { opacity: 0.5; pointer-events: none; }
    .run-btn.done { background: rgba(34,197,94,0.1); color: var(--success); border-color: rgba(34,197,94,0.2); }
    .run-btn.danger { background: var(--danger); color: white; border-color: var(--danger); opacity: 0.9; }
    .run-btn.danger:hover:not(:disabled) { opacity: 1; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.2); }
    .bulk-delete-section { margin-top: 1.5rem; }
    .bulk-card { background: var(--surface2); }
    .bulk-input-row { display: flex; gap: 0.75rem; margin-top: 0.75rem; align-items: stretch; }
    .form-input { flex: 1; padding: 0.6rem 1rem; border-radius: 0.5rem; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary); font-size: 0.85rem; transition: all 0.2s; }
    .form-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-subtle); }
    .mini-spinner { width: 14px; height: 14px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .log-section { background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; padding: 1.25rem; }
    .log-title { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.75rem; }
    .log-list { display: flex; flex-direction: column; gap: 0.4rem; }
    .log-row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.8rem; padding: 0.35rem 0; border-bottom: 1px solid var(--border); }
    .log-row:last-child { border-bottom: none; }
    .log-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .log-dot.success { background: var(--success); }
    .log-dot.fail { background: var(--danger); }
    .log-time { color: var(--text-muted); font-family: monospace; }
    .log-msg { color: var(--text-secondary); }
  `]
})
export class CleanupPageComponent {
  api = inject(ApiService);
  running: string | null = null;
  done = new Set<string>();
  log: { time: Date; msg: string; ok: boolean }[] = [];
  bulkQuery = '';

  onBulkInput(event: Event) {
    this.bulkQuery = (event.target as HTMLInputElement).value;
  }


  rules: Rule[] = [
    {
      id: '1', label: 'Archive promotions', action: 'archive-promotions',
      desc: 'Moves all promotional emails out of your inbox into a ToReview label.',
      color: 'linear-gradient(135deg,#6366f1,#8b5cf6)', icon: 'inbox'
    },
    {
      id: '2', label: 'Delete OTP codes', action: 'delete-otps',
      desc: 'Trashes verification/OTP emails older than 1 hour.',
      color: 'linear-gradient(135deg,#f59e0b,#ef4444)', icon: 'trash-2'
    },
    {
      id: '3', label: 'Clear junk', action: 'clear-junk',
      desc: 'Archives bulk/newsletter mail that you haven\'t opened in 30 days.',
      color: 'linear-gradient(135deg,#10b981,#06b6d4)', icon: 'check-circle'
    },
    {
      id: '4', label: 'Purge Spam', action: 'delete-spam',
      desc: 'Permanently trashes all emails found in your Spam folder.',
      color: 'linear-gradient(135deg,#ef4444,#991b1b)', icon: 'shield-alert'
    },
  ];

  async run(r: Rule) {
    this.running = r.action;
    try {
      await this.api.triggerCleanup(r.action);
      this.done.add(r.action);
      this.log.unshift({ time: new Date(), msg: `"${r.label}" job queued successfully.`, ok: true });
    } catch {
      this.log.unshift({ time: new Date(), msg: `"${r.label}" failed to queue. Check API connection.`, ok: false });
    } finally {
      this.running = null;
    }
  }

  async runBulk() {
    if (!this.bulkQuery) return;
    this.running = 'bulk-delete';
    try {
      await this.api.triggerCleanup('bulk-delete', this.bulkQuery);
      this.done.add('bulk-delete');
      this.log.unshift({ time: new Date(), msg: `Queued bulk delete for query: "${this.bulkQuery}"`, ok: true });
    } catch {
      this.log.unshift({ time: new Date(), msg: `Bulk delete failed to queue.`, ok: false });
    } finally {
      this.running = null;
    }
  }
}
