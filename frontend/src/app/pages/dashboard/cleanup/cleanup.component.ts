import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

interface Rule { id: string; label: string; desc: string; action: string; icon: string; color: string; }

@Component({
  selector: 'app-cleanup-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './cleanup.component.html',
  styleUrl: './cleanup.component.css'
})
export class CleanupPageComponent implements OnInit {
  api = inject(ApiService);
  running: string | null = null;
  done = new Set<string>();
  log: { time: Date; msg: string; ok: boolean }[] = [];
  bulkQuery = '';
  senders: string[] = [];

  async ngOnInit() {
    try {
      const res = await this.api.getEmailSenders();
      this.senders = res.senders || [];
    } catch (e) {
      console.error('Failed to load senders for autocomplete', e);
    }
  }

  setBulkQuery(query: string) {
    this.bulkQuery = query;
  }

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
