import { Component, OnInit, ElementRef, ViewChild, inject, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ThemeService } from '../../../services/theme.service';
import { LucideAngularModule } from 'lucide-angular';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="inbox-page">
      <!-- Stat cards -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">
            <lucide-icon name="inbox" [size]="20" color="white"></lucide-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ loading ? '—' : stats.totalEmailsScanned }}</span>
            <span class="stat-label">Total Scanned</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg,#f59e0b,#f97316)">
            <lucide-icon name="bell" [size]="20" color="white"></lucide-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ loading ? '—' : stats.unreadCount }}</span>
            <span class="stat-label">Unread Emails</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg,#10b981,#3b82f6)">
            <lucide-icon name="sparkles" [size]="20" color="white"></lucide-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ loading ? '—' : stats.important }}</span>
            <span class="stat-label">Priority Mail</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg,#ef4444,#ec4899)">
            <lucide-icon name="shield-alert" [size]="20" color="white"></lucide-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ loading ? '—' : stats.spam }}</span>
            <span class="stat-label">Spam detected</span>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-row">
        <div class="chart-card">
          <div class="chart-header">
            <h3>Mailbox Composition</h3>
            <span class="chart-sub">Overview of your inbox items</span>
          </div>
          <div class="chart-wrap">
            <canvas #donutChart></canvas>
          </div>
        </div>
        <div class="chart-card wide override-overflow">
          <div class="chart-header">
            <h3>Recent Activity</h3>
            <span class="chart-sub">Latest ingested emails</span>
          </div>
          
          <div class="recent-list">
            <div 
              class="email-row" 
              *ngFor="let email of recentEmails; let i = index"
              [class.menu-open]="activeMenuId === email.message_id"
              [style.animation-delay]="i * 40 + 'ms'"
              [style.z-index]="activeMenuId === email.message_id ? 1000 : 1"
            >
              <div class="email-avatar">{{ email.sender?.charAt(0)?.toUpperCase() || '?' }}</div>
              <div class="email-body">
                <div class="email-sender">{{ email.sender }}</div>
                <div class="email-subj">{{ email.subject }}</div>
                <div class="email-cat-tag" *ngIf="email.category && email.category !== 'other'">
                   {{ email.category }}
                </div>
              </div>
              
              <div class="email-opts" (click)="$event.stopPropagation()">
                <button class="menu-trigger" (click)="toggleMenu($event, email.message_id)">
                  <lucide-icon name="more-vertical" [size]="16"></lucide-icon>
                </button>
                <div class="menu-dropdown" *ngIf="activeMenuId === email.message_id">
                  <button class="m-item" (click)="goToDraft(email.thread_id)">
                    <lucide-icon name="pen-box" [size]="12"></lucide-icon>
                    <span>Draft</span>
                  </button>
                  <button class="m-item danger" (click)="deleteEmail(email.message_id)">
                    <lucide-icon name="trash-2" [size]="12"></lucide-icon>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="empty-recent" *ngIf="!loading && !recentEmails.length">
               <p>No recent activity found. Run a sync to ingest data.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="action-row">
        <button class="btn-primary" (click)="refresh()" [disabled]="loading">
          <lucide-icon name="refresh-cw" [size]="15" color="white" [class.spin]="loading"></lucide-icon>
          {{ loading ? 'Syncing...' : 'Sync Mailbox' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .inbox-page { display: flex; flex-direction: column; gap: 1.25rem; }
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; padding: 1.25rem; display: flex; align-items: center; gap: 1rem; position: relative; transition: all 0.2s; }
    .stat-card:hover { box-shadow: var(--card-shadow); transform: translateY(-2px); border-color: var(--accent); }
    .stat-icon { width: 44px; height: 44px; border-radius: 0.85rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-value { display: block; font-size: 1.8rem; font-weight: 800; color: var(--text-primary); line-height: 1; margin-bottom: 0.2rem; }
    .stat-label { display: block; font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; }

    .charts-row { display: grid; grid-template-columns: 320px 1fr; gap: 1.25rem; }
    @media (max-width: 1000px) { .charts-row { grid-template-columns: 1fr; } }
    .chart-card { background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; padding: 1.5rem; position: relative; }
    .override-overflow { overflow: visible !important; }
    .chart-header { margin-bottom: 1.5rem; }
    .chart-header h3 { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.2rem; }
    .chart-sub { font-size: 0.8rem; color: var(--text-secondary); }
    .chart-wrap { position: relative; min-height: 250px; }

    .recent-list { display: flex; flex-direction: column; gap: 0.5rem; overflow: visible; }
    .email-row { display: flex; align-items: center; gap: 0.8rem; padding: 0.85rem; border-radius: 0.85rem; border: 1px solid transparent; transition: all 0.2s; position: relative; animation: slideIn 0.3s ease both; overflow: visible; }
    .email-row:hover { background: var(--surface2); border-color: var(--border); }
    .email-row.menu-open { background: var(--surface2); border-color: var(--accent-subtle); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    @keyframes slideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }

    .email-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--accent-subtle); color: var(--accent); font-weight: 700; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .email-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .email-sender { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .email-subj { font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .email-cat-tag { align-self: flex-start; padding: 0.1rem 0.4rem; background: var(--surface2); border-radius: 4px; font-size: 0.65rem; font-weight: 700; color: var(--accent); text-transform: uppercase; border: 1px solid var(--border); }

    .email-opts { opacity: 1; transition: opacity 0.2s; position: relative; }
    .menu-trigger { border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); cursor: pointer; padding: 0.25rem; border-radius: 0.4rem; display: flex; align-items: center; transition: all 0.2s; }
    .menu-trigger:hover { color: var(--accent); border-color: var(--accent); }
    .email-row.menu-open .menu-trigger { background: var(--accent); color: white; border-color: var(--accent); }

    .menu-dropdown { 
      position: absolute; bottom: 100%; right: 0; 
      background: var(--surface); border: 1px solid var(--border); 
      border-radius: 0.6rem; display: flex; flex-direction: column; 
      padding: 0.3rem; z-index: 10000 !important; min-width: 140px; 
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
      animation: pop 0.15s ease-out; margin-bottom: 0.5rem;
    }
    @keyframes pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .m-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.6rem; border: none; background: none; color: var(--text-primary); font-size: 0.8rem; font-weight: 600; cursor: pointer; width: 100%; text-align: left; border-radius: 0.4rem; transition: background 0.2s; }
    .m-item:hover { background: var(--surface2); }
    .m-item.danger { color: var(--danger); }

    .spin { animation: spin 1.2s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .action-row { display: flex; margin-top: 1rem; }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--accent); color: white; border: none; border-radius: 0.625rem; cursor: pointer; font-size: 0.875rem; font-weight: 700; padding: 0.75rem 1.5rem; transition: all 0.2s; }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class InboxComponent implements OnInit, AfterViewInit {
  @ViewChild('donutChart') donutRef!: ElementRef<HTMLCanvasElement>;

  api   = inject(ApiService);
  router = inject(Router);
  theme = inject(ThemeService);

  loading = true;
  error   = '';
  stats   = { 
    totalEmailsScanned: 0, 
    unreadCount: 0, 
    riskSignals: 0,
    spam: 0,
    promotions: 0,
    otp: 0,
    newsletters: 0,
    important: 0,
    other: 0
  };
  recentEmails: any[] = [];
  activeMenuId: string | null = null;

  private donutChart?: Chart;

  @HostListener('document:click')
  closeMenus() {
    this.activeMenuId = null;
  }

  async ngOnInit() {
    await this.loadData();
  }
  ngAfterViewInit() { this.buildCharts(); }

  async refresh() {
    this.loading = true;
    try { 
        await this.api.syncMailbox();
        await this.loadData(); 
    } catch { this.loading = false; }
  }

  private async loadData() {
    this.loading = true;
    try {
      const [status, emailsRes] = await Promise.all([
        this.api.getMailboxStatus(),
        this.api.getEmails()
      ]);
      this.stats = status;
      this.recentEmails = (emailsRes.emails || []).slice(0, 5);
      this.updateDonut();
    } catch (e: any) {
      this.error = 'Failed to load dashboard.';
    } finally { this.loading = false; }
  }

  toggleMenu(event: Event, id: string) {
    event.stopPropagation();
    this.activeMenuId = this.activeMenuId === id ? null : id;
  }

  goToDraft(threadId: string) {
    this.router.navigate(['/dashboard/draft'], { queryParams: { threadId } });
  }

  async deleteEmail(id: string) {
    const index = this.recentEmails.findIndex(e => e.message_id === id);
    if (index > -1) {
        this.recentEmails.splice(index, 1);
        try { await this.api.deleteMessage(id); } catch { this.loadData(); }
    }
  }

  private get grid() { return this.theme.theme() === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'; }
  private get txt()  { return this.theme.theme() === 'dark' ? '#94a3b8' : '#64748b'; }

  private buildCharts() {
    if (!this.donutRef?.nativeElement) return;
    this.donutChart = new Chart(this.donutRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Promotions', 'Spam', 'OTP', 'Newsletters', 'Important', 'Other'],
        datasets: [{ 
            data: [0, 0, 0, 0, 0, 0], 
            backgroundColor: ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#94a3b8'], 
            borderWidth: 0, 
            hoverOffset: 10 
        }]
      },
      options: {
        responsive: true, 
        maintainAspectRatio: false, 
        cutout: '75%',
        plugins: { 
            legend: { 
                position: 'bottom', 
                labels: { color: this.txt, boxWidth: 10, font: { size: 11 }, padding: 15 } 
            } 
        }
      }
    });
  }

  private updateDonut() {
    if (!this.donutChart) return;
    this.donutChart.data.datasets[0].data = [
        this.stats.promotions,
        this.stats.spam,
        this.stats.otp,
        this.stats.newsletters,
        this.stats.important,
        this.stats.other
    ];
    this.donutChart.update();
  }
}
