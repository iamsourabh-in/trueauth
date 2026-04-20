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
        <h2 class="page-title">Audit Logs & History</h2>
        <p class="page-sub">A full trail of all synchronization and cleanup actions taken by TrueAuth.</p>
      </div>

      <div class="logs-container glass-card">
         <div class="logs-header">
            <div class="col-type">Type</div>
            <div class="col-details">Details</div>
            <div class="col-status">Status</div>
            <div class="col-time">Time</div>
         </div>

         <div class="logs-list">
            <div class="log-item" *ngFor="let log of logs; let i = index" [style.animation-delay]="i * 30 + 'ms'">
               <div class="col-type">
                  <div class="type-icon" [class]="log.type">
                     <lucide-icon [name]="log.type === 'sync' ? 'refresh-cw' : 'shield-check'" [size]="14"></lucide-icon>
                  </div>
                  <span class="type-text">{{ log.type }}</span>
               </div>
               
               <div class="col-details">
                  <span class="detail-text">{{ log.details }}</span>
               </div>

               <div class="col-status">
                  <span class="status-badge" [class]="log.status">{{ log.status }}</span>
               </div>

               <div class="col-time">
                  {{ log.timestamp | date:'MMM d, h:mm a' }}
               </div>
            </div>

            <div class="empty-state" *ngIf="!loading && logs.length === 0">
               <lucide-icon name="clipboard-list" [size]="40" style="opacity: 0.2"></lucide-icon>
               <p>No activity logs found yet.</p>
            </div>
            
            <div class="loading-state" *ngIf="loading">
                <div class="spinner"></div>
            </div>
         </div>
      </div>
    </div>
  `,
  styles: [`
    .audit-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-title { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem; }
    .page-sub { font-size: 0.875rem; color: var(--text-secondary); }

    .logs-container { padding: 0; overflow: hidden; border-radius: 1rem; }
    
    .logs-header { 
      display: flex; padding: 1rem 1.5rem; background: var(--surface2); 
      border-bottom: 1px solid var(--border); font-size: 0.75rem; 
      font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;
    }
    
    .col-type { width: 120px; display: flex; align-items: center; gap: 0.75rem; }
    .col-details { flex: 1; min-width: 0; padding: 0 1rem; }
    .col-status { width: 100px; display: flex; justify-content: center; }
    .col-time { width: 150px; text-align: right; color: var(--text-muted); font-size: 0.8rem; }

    .log-item { 
      display: flex; padding: 1.1rem 1.5rem; border-bottom: 1px solid var(--border);
      align-items: center; transition: background 0.2s; animation: fadeIn 0.3s ease-both;
    }
    .log-item:hover { background: var(--surface2); }
    .log-item:last-child { border-bottom: none; }

    .type-icon { 
      width: 28px; height: 28px; border-radius: 50%; 
      display: flex; align-items: center; justify-content: center;
    }
    .type-icon.sync { background: var(--accent-subtle); color: var(--accent); }
    .type-icon.cleanup { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    .type-text { font-size: 0.85rem; font-weight: 600; text-transform: capitalize; color: var(--text-primary); }

    .detail-text { font-size: 0.875rem; color: var(--text-primary); font-weight: 500; }
    
    .status-badge { 
      font-size: 0.65rem; font-weight: 800; padding: 0.15rem 0.5rem; 
      border-radius: 4px; text-transform: uppercase;
    }
    .status-badge.success, .status-badge.completed { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    .status-badge.failed { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

    .empty-state { padding: 4rem; text-align: center; color: var(--text-muted); }
    .loading-state { padding: 3rem; display: flex; justify-content: center; }
    .spinner { width: 24px; height: 24px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AuditLogsComponent implements OnInit {
  api = inject(ApiService);
  logs: any[] = [];
  loading = true;

  async ngOnInit() {
    try {
      this.logs = await this.api.getAuditLogs();
    } catch (err) {
      console.error('Audit logs failed', err);
    } finally {
      this.loading = false;
    }
  }
}
