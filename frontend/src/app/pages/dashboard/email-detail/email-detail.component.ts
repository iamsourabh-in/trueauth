import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-email-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DatePipe],
  template: `
    <div class="detail-container anim-fade-in" *ngIf="email; else loading">
      <!-- Toolbar -->
      <div class="toolbar">
        <button class="back-btn" (click)="router.navigate(['/dashboard/inbox'])">
          <lucide-icon name="arrow-left" [size]="18"></lucide-icon>
          <span>Back to Inbox</span>
        </button>
        <div class="actions">
          <button class="icon-btn" title="Archive">
            <lucide-icon name="archive" [size]="18"></lucide-icon>
          </button>
          <button class="icon-btn" title="Delete">
            <lucide-icon name="trash-2" [size]="18"></lucide-icon>
          </button>
          <button class="icon-btn" title="Mark Unread">
            <lucide-icon name="mail" [size]="18"></lucide-icon>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="email-card glass-card">
        <div class="header">
          <h1 class="subject">{{ email.subject || '(No Subject)' }}</h1>
          <div class="meta-row">
             <div class="sender-info">
               <div class="avatar">{{ email.sender?.charAt(0)?.toUpperCase() || '?' }}</div>
               <div class="details">
                 <span class="sender-name">{{ email.sender }}</span>
                 <span class="to-me">to me</span>
               </div>
             </div>
             <span class="date">{{ email.received_at | date:'MMM d, y, h:mm a' }}</span>
          </div>
        </div>

        <!-- AI Insights -->
        <div class="ai-insights" *ngIf="email.ai_metadata || email.category">
            <div class="ai-summary" *ngIf="email.ai_metadata?.summary">
               <lucide-icon name="sparkles" [size]="16"></lucide-icon>
               <p>{{ email.ai_metadata.summary }}</p>
            </div>
            <div class="metadata-row">
               <span class="badge category" *ngIf="email.category">{{ email.category }}</span>
               <span class="badge tag" *ngFor="let tag of email.ai_metadata?.tags">{{ tag }}</span>
               <span class="badge sentiment" *ngIf="email.ai_metadata?.sentiment">{{ email.ai_metadata.sentiment }} sentiment</span>
            </div>
        </div>

        <div class="body-container">
          <pre class="body-text">{{ email.body }}</pre>
        </div>

        <!-- Footer -->
        <div class="detail-footer">
           <button class="action-btn primary">
              <lucide-icon name="reply" [size]="18"></lucide-icon>
              <span>Reply</span>
           </button>
           <button class="action-btn">
              <lucide-icon name="forward" [size]="18"></lucide-icon>
              <span>Forward</span>
           </button>
        </div>
      </div>
    </div>

    <ng-template #loading>
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading email details...</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .detail-container { max-width: 900px; margin: 0 auto; }
    
    .toolbar {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .back-btn {
      display: flex; align-items: center; gap: 0.5rem;
      background: none; border: none; cursor: pointer;
      color: var(--text-secondary); font-size: 0.875rem; font-weight: 500;
      padding: 0.5rem; border-radius: 0.5rem; transition: all 0.2s;
    }
    .back-btn:hover { background: var(--surface2); color: var(--text-primary); }
    
    .actions { display: flex; gap: 0.5rem; }
    .icon-btn {
      background: var(--surface); border: 1px solid var(--border);
      padding: 0.5rem; border-radius: 0.5rem; cursor: pointer;
      color: var(--text-secondary); transition: all 0.2s;
    }
    .icon-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-subtle); }

    .email-card { padding: 2.5rem; border-radius: 1rem; }
    
    .header { margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; }
    .subject { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 1.5rem; line-height: 1.3; }
    
    .meta-row { display: flex; align-items: center; justify-content: space-between; }
    .sender-info { display: flex; align-items: center; gap: 0.75rem; }
    .avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      color: white; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1.1rem;
    }
    .details { display: flex; flex-direction: column; gap: 0.1rem; }
    .sender-name { font-weight: 600; color: var(--text-primary); font-size: 0.93rem; }
    .to-me { font-size: 0.75rem; color: var(--text-muted); }
    .date { font-size: 0.81rem; color: var(--text-muted); }

    .ai-insights {
      margin-bottom: 2rem; padding: 1.25rem;
      background: var(--accent-subtle); border-radius: 0.875rem;
      border: 1px solid var(--accent); border-left-width: 4px;
    }
    .ai-summary { display: flex; gap: 0.75rem; margin-bottom: 1rem; color: var(--text-primary); }
    .ai-summary p { font-size: 0.95rem; font-weight: 500; line-height: 1.5; margin: 0; }
    .ai-summary lucide-icon { color: var(--accent); flex-shrink: 0; margin-top: 0.1rem; }

    .metadata-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .badge {
      font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.6rem;
      border-radius: 2rem; text-transform: capitalize;
    }
    .badge.category { background: var(--accent); color: white; }
    .badge.tag { background: var(--surface); color: var(--text-secondary); border: 1px solid var(--border); }
    .badge.sentiment { background: var(--surface2); color: var(--text-primary); }

    .body-container { margin-bottom: 2.5rem; min-height: 200px; }
    .body-text {
      white-space: pre-wrap; font-family: inherit; font-size: 0.95rem;
      line-height: 1.7; color: var(--text-primary);
    }

    .detail-footer { display: flex; gap: 0.75rem; }
    .action-btn {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.6rem 1.25rem; border-radius: 0.75rem;
      font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .action-btn { background: var(--surface2); border: 1px solid var(--border); color: var(--text-primary); }
    .action-btn.primary { background: var(--accent); border-color: var(--accent); color: white; }
    .action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px var(--shadow); }

    .loading-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 400px; gap: 1rem; color: var(--text-secondary);
    }
    .spinner {
      width: 40px; height: 40px; border: 3px solid var(--border);
      border-top-color: var(--accent); border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .detail-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .header-right { flex-direction: row-reverse; justify-content: space-between; width: 100%; border-top: 1px solid var(--border); padding-top: 1rem; }
      .detail-title { font-size: 1.1rem; }
      .detail-footer { flex-direction: column; }
      .action-btn { justify-content: center; width: 100%; }
    }
  `]
})
export class EmailDetailComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  api = inject(ApiService);

  email: any = null;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      try {
        this.email = await this.api.getMessageDetail(id);
      } catch (err) {
        console.error('Email detail error', err);
        this.router.navigate(['/dashboard/inbox']);
      }
    }
  }
}
