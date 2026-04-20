import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DatePipe],
  template: `
    <div class="audit-page anim-fade-in">
      <div class="page-header">
        <div>
          <h2 class="page-title">Activity Audit Trail</h2>
          <p class="page-sub">Comprehensive history of synchronization and automated cleanup actions.</p>
        </div>
        <button class="btn-danger-outline" (click)="clearLogs()" [disabled]="loading || (cleanupLogs.length === 0 && syncLogs.length === 0)">
           <lucide-icon name="trash-2" [size]="16"></lucide-icon>
           <span>Clear History</span>
        </button>
      </div>

      <!-- Part 1: Sync Summary Cards -->
      <div class="section-title">
        <lucide-icon name="refresh-cw" [size]="16"></lucide-icon>
        <span>Recent Sync History</span>
      </div>
      
      <div class="sync-grid" *ngIf="syncLogs.length > 0">
         <div class="sync-card glass-card" *ngFor="let log of syncLogs">
            <div class="sync-header">
               <span class="sync-date">{{ log.created_at | date:'MMM d, h:mm a' }}</span>
               <span class="status-dot" [class]="log.status"></span>
            </div>
            <div class="sync-stats">
               <div class="stat">
                  <span class="label">Processed</span>
                  <span class="value">{{ log.emails_count }} emails</span>
               </div>
               <div class="stat">
                  <span class="label">Status</span>
                  <span class="value status-text" [class]="log.status">{{ log.status }}</span>
               </div>
            </div>
         </div>
      </div>
      <div class="empty-mini shadow-sm" *ngIf="!loading && syncLogs.length === 0">
         No synchronization records found.
      </div>

      <!-- Part 2: Cleanup Logs Table -->
      <div class="section-title mt-8">
        <lucide-icon name="trash-2" [size]="16"></lucide-icon>
        <span>Detailed Cleanup Logs</span>
      </div>

      <div class="logs-table-container glass-card">
         <table class="audit-table">
            <thead>
               <tr>
                  <th>Action Type</th>
                  <th>Description</th>
                  <th>Result</th>
                  <th>Timestamp</th>
               </tr>
            </thead>
            <tbody>
               <tr *ngFor="let log of cleanupLogs; let i = index">
                  <td>
                     <div class="action-type">
                        <div class="type-indicator"></div>
                        {{ log.action_type?.replace('_', ' ') | uppercase }}
                     </div>
                  </td>
                  <td>
                     <div class="detail-cell">
                        <span class="main-detail">Processed thread: {{ log.thread_id }}</span>
                        <span class="sub-detail" *ngIf="log.metadata?.subject">{{ log.metadata.subject }}</span>
                     </div>
                  </td>
                  <td>
                     <span class="status-badge" [class]="log.status">{{ log.status }}</span>
                  </td>
                  <td class="time-cell">
                     {{ log.action_taken_at | date:'MMM d, y, h:mm:ss a' }}
                  </td>
               </tr>
            </tbody>
         </table>

         <div class="empty-state" *ngIf="!loading && cleanupLogs.length === 0">
            <lucide-icon name="clipboard-list" [size]="44" style="opacity: 0.1"></lucide-icon>
            <p>No cleanup actions recorded yet.</p>
         </div>

         <div class="loading-overlay" *ngIf="loading">
            <div class="spinner"></div>
         </div>

         <!-- Pagination -->
         <div class="pagination-footer" *ngIf="totalCleanup > 0">
            <span class="total-info">Showing {{ cleanupLogs.length }} of {{ totalCleanup }} records</span>
            <div class="page-controls">
               <button class="page-btn" [disabled]="currentPage === 1" (click)="changePage(currentPage - 1)">
                  <lucide-icon name="chevron-left" [size]="16"></lucide-icon>
               </button>
               <span class="curr-page">Page {{ currentPage }}</span>
               <button class="page-btn" [disabled]="!hasMore" (click)="changePage(currentPage + 1)">
                  <lucide-icon name="chevron-right" [size]="16"></lucide-icon>
               </button>
            </div>
         </div>
      </div>
    </div>
  `,
  styles: [`
    .audit-page { display: flex; flex-direction: column; gap: 1.25rem; padding-bottom: 3rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .page-title { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem; }
    .page-sub { font-size: 0.875rem; color: var(--text-secondary); }

    .btn-danger-outline {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.6rem 1rem; border-radius: 0.75rem;
      border: 1px solid var(--danger); background: transparent;
      color: var(--danger); font-size: 0.875rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-danger-outline:hover:not(:disabled) { background: var(--danger); color: white; }
    .btn-danger-outline:disabled { opacity: 0.5; cursor: not-allowed; }

    .section-title { 
      display: flex; align-items: center; gap: 0.6rem; 
      font-size: 0.9rem; font-weight: 700; color: var(--text-secondary);
      margin-bottom: 0.5rem;
    }
    .mt-8 { margin-top: 2rem; }

    /* Sync Grid */
    .sync-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
    .sync-card { padding: 1.25rem; border-radius: 1rem; border: 1px solid var(--border); transition: all 0.2s; }
    .sync-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .sync-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .sync-date { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; }
    .status-dot.success { background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.4); }
    
    .sync-stats { display: flex; flex-direction: column; gap: 0.5rem; }
    .stat { display: flex; flex-direction: column; }
    .stat .label { font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; }
    .stat .value { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }
    .status-text { text-transform: capitalize; }
    .status-text.success { color: #10b981; }

    /* Table */
    .logs-table-container { 
      background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; 
      overflow: hidden; position: relative;
    }
    .audit-table { width: 100%; border-collapse: collapse; text-align: left; }
    .audit-table th { 
      background: var(--surface2); padding: 1rem 1.25rem; 
      font-size: 0.75rem; font-weight: 700; color: var(--text-muted); 
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .audit-table td { padding: 1.1rem 1.25rem; border-bottom: 1px solid var(--border); }
    .audit-table tr:last-child td { border-bottom: none; }

    .action-type { display: flex; align-items: center; gap: 0.75rem; font-weight: 700; font-size: 0.85rem; color: var(--text-primary); }
    .type-indicator { width: 4px; height: 16px; border-radius: 2px; background: var(--accent); }

    .detail-cell { display: flex; flex-direction: column; gap: 0.15rem; }
    .main-detail { font-size: 0.875rem; color: var(--text-primary); font-weight: 500; }
    .sub-detail { font-size: 0.75rem; color: var(--text-muted); }

    .status-badge { 
      font-size: 0.65rem; font-weight: 800; padding: 0.15rem 0.5rem; 
      border-radius: 4px; text-transform: uppercase;
    }
    .status-badge.completed, .status-badge.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    
    .time-cell { font-size: 0.8rem; color: var(--text-muted); text-align: right; }

    .pagination-footer { 
      display: flex; justify-content: space-between; align-items: center; 
      padding: 1rem 1.25rem; background: var(--surface2); border-top: 1px solid var(--border);
    }
    .total-info { font-size: 0.75rem; color: var(--text-secondary); font-weight: 500; }
    .page-controls { display: flex; align-items: center; gap: 1rem; }
    .page-btn { 
      background: var(--surface); border: 1px solid var(--border); 
      padding: 0.4rem; border-radius: 0.5rem; cursor: pointer; color: var(--text-primary);
      transition: all 0.2s;
    }
    .page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .curr-page { font-size: 0.8rem; font-weight: 700; color: var(--text-primary); }

    .loading-overlay { 
      position: absolute; inset: 0; background: rgba(var(--surface-rgb), 0.7); 
      display: flex; align-items: center; justify-content: center; z-index: 10;
    }
    .spinner { width: 30px; height: 30px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    
    .empty-mini { padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; border: 1px dashed var(--border); border-radius: 1rem; }
    .empty-state { padding: 4rem; text-align: center; color: var(--text-muted); }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class AuditLogsComponent implements OnInit {
  api = inject(ApiService);
  
  syncLogs: any[] = [];
  cleanupLogs: any[] = [];
  
  loading = true;
  currentPage = 1;
  totalCleanup = 0;
  hasMore = false;

  async ngOnInit() {
    await this.loadLogs();
  }

  async loadLogs(page: number = 1) {
    this.loading = true;
    try {
      const res = await this.api.getAuditLogs(page);
      this.syncLogs = res.sync;
      this.cleanupLogs = res.cleanup.data;
      this.totalCleanup = res.cleanup.total;
      this.hasMore = res.cleanup.hasMore;
      this.currentPage = page;
    } catch (err) {
      console.error('Audit logs failed', err);
    } finally {
      this.loading = false;
    }
  }

  async changePage(page: number) {
    if (page < 1) return;
    await this.loadLogs(page);
  }

  async clearLogs() {
    if (!confirm('Are you sure you want to clear your entire activity history? This action cannot be undone.')) return;
    
    this.loading = true;
    try {
      await this.api.clearAuditLogs();
      this.syncLogs = [];
      this.cleanupLogs = [];
      this.totalCleanup = 0;
      this.currentPage = 1;
      this.hasMore = false;
    } catch (err) {
      console.error('Failed to clear logs', err);
    } finally {
      this.loading = false;
    }
  }
}
