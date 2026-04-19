import { Component, OnInit, ElementRef, ViewChild, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { ThemeService } from '../../../services/theme.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="inbox-page">
      <!-- Stat cards -->
      <div class="stats-row">
        <div class="stat-card" *ngFor="let s of statCards">
          <div class="stat-icon" [style.background]="s.bg">
            <span [innerHTML]="s.icon"></span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ loading ? '—' : s.value }}</span>
            <span class="stat-label">{{ s.label }}</span>
          </div>
          <div class="stat-trend" [class.up]="s.trend > 0" [class.down]="s.trend < 0">
            {{ s.trend > 0 ? '↑' : s.trend < 0 ? '↓' : '→' }} {{ s.trend !== 0 ? (s.trend | number:'1.0-0') + '%' : 'stable' }}
          </div>
        </div>
      </div>

      <!-- Error banner -->
      <div class="error-banner" *ngIf="error">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ error }}
      </div>

      <!-- Charts row -->
      <div class="charts-row">
        <div class="chart-card">
          <div class="chart-header">
            <h3>Inbox composition</h3>
            <span class="chart-sub">Scanned email categories</span>
          </div>
          <div class="chart-wrap">
            <canvas #donutChart></canvas>
          </div>
        </div>

        <div class="chart-card wide">
          <div class="chart-header">
            <h3>Email activity</h3>
            <span class="chart-sub">Daily message volume (est.)</span>
          </div>
          <div class="chart-wrap tall">
            <canvas #barChart></canvas>
          </div>
        </div>
      </div>

      <!-- Refresh button -->
      <div class="action-bar">
        <button class="btn-primary" (click)="refresh()" [disabled]="loading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          {{ loading ? 'Scanning…' : 'Scan mailbox' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .inbox-page { display: flex; flex-direction: column; gap: 1.5rem; }

    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }

    .stat-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 1rem;
      padding: 1.25rem; display: flex; align-items: center; gap: 1rem;
      position: relative; overflow: hidden; transition: box-shadow 0.2s, transform 0.2s;
    }
    .stat-card:hover { box-shadow: var(--card-shadow); transform: translateY(-2px); }
    .stat-icon {
      width: 44px; height: 44px; border-radius: 0.75rem; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
    }
    .stat-icon svg { width: 20px; height: 20px; stroke: white; }
    .stat-info { flex: 1; min-width: 0; }
    .stat-value { display: block; font-size: 1.75rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .stat-label { display: block; font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem; font-weight: 500; }
    .stat-trend { font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 99px; position: absolute; top: 0.75rem; right: 0.75rem; }
    .stat-trend.up { background: rgba(34,197,94,0.12); color: var(--success); }
    .stat-trend.down { background: rgba(239,68,68,0.1); color: var(--danger); }
    .stat-trend:not(.up):not(.down) { background: var(--surface2); color: var(--text-muted); }

    .error-banner {
      display: flex; align-items: center; gap: 0.5rem;
      background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
      color: var(--danger); padding: 0.75rem 1rem; border-radius: 0.75rem; font-size: 0.875rem;
    }

    .charts-row { display: grid; grid-template-columns: 280px 1fr; gap: 1.25rem; }
    @media (max-width: 900px) { .charts-row { grid-template-columns: 1fr; } }

    .chart-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 1rem; padding: 1.25rem;
    }
    .chart-header { margin-bottom: 1rem; }
    .chart-header h3 { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.1rem; }
    .chart-sub { font-size: 0.78rem; color: var(--text-secondary); }
    .chart-wrap { position: relative; height: 220px; }
    .chart-wrap.tall { height: 220px; }

    .action-bar { display: flex; gap: 0.75rem; }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 0.5rem;
      background: var(--accent); color: white;
      border: none; border-radius: 0.625rem; cursor: pointer;
      font-size: 0.875rem; font-weight: 600; padding: 0.65rem 1.25rem;
      transition: all 0.2s;
    }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.6; pointer-events: none; }
    .btn-primary svg { color: white; stroke: white; }
  `]
})
export class InboxComponent implements OnInit, AfterViewInit {
  @ViewChild('donutChart') donutRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart')   barRef!: ElementRef<HTMLCanvasElement>;

  api    = inject(ApiService);
  theme  = inject(ThemeService);

  loading = true;
  error   = '';

  stats = { totalEmailsScanned: 0, unreadCount: 0, riskSignals: 0 };

  private donutChart?: Chart;
  private barChart?: Chart;

  get statCards() {
    return [
      { label: 'Scanned',     value: this.stats.totalEmailsScanned, trend: 0,    bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9l10 6 10-6"/></svg>` },
      { label: 'Unread',      value: this.stats.unreadCount,        trend: -12,  bg: 'linear-gradient(135deg,#f59e0b,#f97316)', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>` },
      { label: 'Risk signals', value: this.stats.riskSignals,       trend: 0,    bg: 'linear-gradient(135deg,#ef4444,#ec4899)', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>` },
    ];
  }

  async ngOnInit() { await this.loadData(); }

  ngAfterViewInit() { this.buildCharts(); }

  async refresh() {
    this.loading = true;
    this.error = '';
    try { await this.api.syncGoogleTokensFromSession(); } catch { /* best effort */ }
    await this.loadData();
  }

  private async loadData() {
    this.loading = true;
    try {
      const res = await this.api.getMailboxStatus();
      this.stats = res;
      this.updateCharts();
    } catch (e: any) {
      this.error = e?.error?.error ?? e?.message ?? 'Could not load mailbox status.';
    } finally {
      this.loading = false;
    }
  }

  private get gridColor() { return this.theme.theme() === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'; }
  private get textColor()  { return this.theme.theme() === 'dark' ? '#94a3b8' : '#64748b'; }

  private buildCharts() {
    if (!this.donutRef || !this.barRef) return;

    this.donutChart = new Chart(this.donutRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Read', 'Unread', 'Risk'],
        datasets: [{ data: [80, 15, 5], backgroundColor: ['#6366f1','#f59e0b','#ef4444'], borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '70%',
        plugins: { legend: { position: 'bottom', labels: { color: this.textColor, boxWidth: 12, padding: 16 } } }
      }
    });

    const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const data   = [42, 58, 37, 65, 52, 28, 15];

    this.barChart = new Chart(this.barRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Emails received',
          data,
          backgroundColor: 'rgba(99,102,241,0.75)',
          borderRadius: 6,
          hoverBackgroundColor: '#8b5cf6'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: this.gridColor }, ticks: { color: this.textColor } },
          y: { grid: { color: this.gridColor }, ticks: { color: this.textColor } }
        }
      }
    });
  }

  private updateCharts() {
    if (!this.donutChart) return;
    const total = Math.max(this.stats.totalEmailsScanned, 1);
    const unread = this.stats.unreadCount;
    const risk   = this.stats.riskSignals;
    const read   = Math.max(total - unread - risk, 0);
    this.donutChart.data.datasets[0].data = [read, unread, risk];
    this.donutChart.update();
  }
}
