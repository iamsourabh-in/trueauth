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
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.css'
})
export class InboxComponent implements OnInit, AfterViewInit {
  @ViewChild('donutChart') donutRef!: ElementRef<HTMLCanvasElement>;

  api   = inject(ApiService);
  router = inject(Router);
  theme = inject(ThemeService);

  loading = true;
  briefLoading = false;
  dailyBrief = '';
  error   = '';
  stats   = { 
    totalEmailsInGmail: 0,
    totalEmailsScanned: 0, 
    unreadCount: 0, 
    starredCount: 0,
    draftsCount: 0,
    important: 0,
    spam: 0,
    promotions: 0,
    otp: 0,
    newsletters: 0,
    other: 0,
    initialSyncStatus: 'pending'
  };
  recentEmails: any[] = [];
  activeMenuId: string | null = null;

  async generateBrief() {
    this.briefLoading = true;
    try {
      const res = await this.api.getDailyBrief();
      this.dailyBrief = res.summary;
    } catch (e) {
      console.error('Brief failed', e);
    } finally {
      this.loading = false; // Actually briefLoading
      this.briefLoading = false;
    }
  }

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
      this.error = 'Failed to load dash.';
    } finally { this.loading = false; }
  }

  async pauseScan() {
    try {
      await this.api.pauseHistoricalSync();
      this.stats.initialSyncStatus = 'paused';
    } catch { }
  }

  async resumeScan() {
    try {
      await this.api.resumeHistoricalSync();
      this.stats.initialSyncStatus = 'in_progress';
      // Status will eventually update via polling or next refresh too
    } catch { }
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

  private get txt() { return this.theme.theme() === 'dark' ? '#94a3b8' : '#64748b'; }

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
            hoverOffset: 12 
        }]
      },
      options: {
        responsive: true, 
        maintainAspectRatio: false, 
        cutout: '72%',
        plugins: { legend: { position: 'bottom', labels: { color: this.txt, boxWidth: 8, font: { size: 10 }, padding: 12 } } }
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
