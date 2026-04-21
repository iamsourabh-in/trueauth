import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DatePipe],
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.css'
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
