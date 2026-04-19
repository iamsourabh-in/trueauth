import { Component, OnInit, ElementRef, ViewChild, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
            <span class="stat-label">Emails scanned</span>
          </div>
          <div class="stat-trend neutral">→ stable</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg,#f59e0b,#f97316)">
            <lucide-icon name="bell" [size]="20" color="white"></lucide-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ loading ? '—' : stats.unreadCount }}</span>
            <span class="stat-label">Unread</span>
          </div>
          <div class="stat-trend down">↓ 12%</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg,#ef4444,#ec4899)">
            <lucide-icon name="shield-alert" [size]="20" color="white"></lucide-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ loading ? '—' : stats.riskSignals }}</span>
            <span class="stat-label">Risk signals</span>
          </div>
          <div class="stat-trend neutral">→ stable</div>
        </div>
      </div>

      <!-- Error banner -->
      <div class="error-banner" *ngIf="error">
        <lucide-icon name="alert-circle" [size]="16"></lucide-icon>
        {{ error }}
      </div>

      <!-- Charts -->
      <div class="charts-row">
        <div class="chart-card">
          <div class="chart-header">
            <h3>Inbox composition</h3>
            <span class="chart-sub">By category</span>
          </div>
          <div class="chart-wrap">
            <canvas #donutChart></canvas>
          </div>
        </div>
        <div class="chart-card wide">
          <div class="chart-header">
            <h3>Weekly activity</h3>
            <span class="chart-sub">Estimated daily volume</span>
          </div>
          <div class="chart-wrap">
            <canvas #barChart></canvas>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="action-row">
        <button class="btn-primary" (click)="refresh()" [disabled]="loading">
          <lucide-icon name="refresh-cw" [size]="15" color="white"></lucide-icon>
          {{ loading ? 'Scanning…' : 'Scan mailbox' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .inbox-page { display: flex; flex-direction: column; gap: 1.25rem; }

    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 1rem; }

    .stat-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 1rem;
      padding: 1.1rem 1.25rem; display: flex; align-items: center; gap: 1rem;
      position: relative; transition: box-shadow 0.2s, transform 0.2s;
    }
    .stat-card:hover { box-shadow: var(--card-shadow); transform: translateY(-2px); }

    .stat-icon {
      width: 42px; height: 42px; border-radius: 0.75rem;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .stat-info { flex: 1; }
    .stat-value { display: block; font-size: 1.7rem; font-weight: 800; color: var(--text-primary); line-height: 1; margin-bottom: 0.2rem; }
    .stat-label { display: block; font-size: 0.75rem; color: var(--text-secondary); font-weight: 500; }
    .stat-trend { position: absolute; top: 0.75rem; right: 0.85rem; font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.45rem; border-radius: 99px; }
    .stat-trend.up   { background: rgba(34,197,94,0.12); color: var(--success); }
    .stat-trend.down { background: rgba(239,68,68,0.1);  color: var(--danger); }
    .stat-trend.neutral { background: var(--surface2); color: var(--text-muted); }

    .error-banner {
      display: flex; align-items: center; gap: 0.5rem;
      background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
      color: var(--danger); padding: 0.75rem 1rem; border-radius: 0.75rem; font-size: 0.875rem;
    }

    .charts-row { display: grid; grid-template-columns: 260px 1fr; gap: 1.25rem; }
    @media (max-width: 860px) { .charts-row { grid-template-columns: 1fr; } }

    .chart-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; padding: 1.25rem;
    }
    .chart-header { margin-bottom: 0.85rem; }
    .chart-header h3 { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.1rem; }
    .chart-sub { font-size: 0.75rem; color: var(--text-secondary); }
    .chart-wrap { position: relative; height: 200px; }

    .action-row { display: flex; gap: 0.75rem; }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 0.5rem;
      background: var(--accent); color: white; border: none; border-radius: 0.625rem;
      cursor: pointer; font-size: 0.875rem; font-weight: 600; padding: 0.65rem 1.2rem;
      transition: all 0.2s;
    }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.55; pointer-events: none; }
  `]
})
export class InboxComponent implements OnInit, AfterViewInit {
  @ViewChild('donutChart') donutRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart')   barRef!: ElementRef<HTMLCanvasElement>;

  api   = inject(ApiService);
  theme = inject(ThemeService);

  loading = true;
  error   = '';
  stats   = { totalEmailsScanned: 0, unreadCount: 0, riskSignals: 0 };

  private donutChart?: Chart;
  private barChart?: Chart;

  async ngOnInit()    { await this.loadData(); }
  ngAfterViewInit()   { this.buildCharts(); }

  async refresh() {
    this.loading = true; this.error = '';
    try { await this.api.syncGoogleTokensFromSession(); } catch { /* best effort */ }
    await this.loadData();
  }

  private async loadData() {
    this.loading = true;
    try {
      this.stats = await this.api.getMailboxStatus();
      this.updateDonut();
    } catch (e: any) {
      this.error = e?.error?.error ?? e?.message ?? 'Could not load mailbox status.';
    } finally { this.loading = false; }
  }

  private get grid() { return this.theme.theme() === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'; }
  private get txt()  { return this.theme.theme() === 'dark' ? '#94a3b8' : '#64748b'; }

  private buildCharts() {
    if (!this.donutRef?.nativeElement || !this.barRef?.nativeElement) return;

    this.donutChart = new Chart(this.donutRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Read', 'Unread', 'Risk'],
        datasets: [{ data: [75, 20, 5], backgroundColor: ['#6366f1', '#f59e0b', '#ef4444'], borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: { legend: { position: 'bottom', labels: { color: this.txt, boxWidth: 12, padding: 14, font: { size: 11 } } } }
      }
    });

    this.barChart = new Chart(this.barRef.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{ label: 'Emails', data: [42, 58, 37, 65, 52, 28, 15], backgroundColor: 'rgba(99,102,241,0.75)', borderRadius: 6, hoverBackgroundColor: '#a78bfa' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: this.grid }, ticks: { color: this.txt } },
          y: { grid: { color: this.grid }, ticks: { color: this.txt } }
        }
      }
    });
  }

  private updateDonut() {
    if (!this.donutChart) return;
    const total  = Math.max(this.stats.totalEmailsScanned, 1);
    const unread = this.stats.unreadCount;
    const risk   = this.stats.riskSignals;
    this.donutChart.data.datasets[0].data = [Math.max(total - unread - risk, 0), unread, risk];
    this.donutChart.update();
  }
}
