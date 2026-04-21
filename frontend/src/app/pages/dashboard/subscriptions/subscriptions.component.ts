import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

interface Sub { 
  id: string;
  sender: string; 
  unsubscribe_link?: string; 
  status: string;
  created_at: string;
}

@Component({
  selector: 'app-subscriptions-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.css'
})
export class SubscriptionsPageComponent implements OnInit {
  api = inject(ApiService);
  loading = true;
  subs: Sub[] = [];
  activeStatus = 'active';
  activeCount = 0;
  unsubCount = 0;

  async ngOnInit() { 
    await this.load();
    this.updateStats();
  }

  async setStatus(status: string) {
    this.activeStatus = status;
    await this.load();
  }

  async load(status = this.activeStatus, forceRefresh = false) {
    this.loading = true;
    try {
      const res = await this.api.getSubscriptions(status);
      this.subs = res.subscriptions ?? [];
      // If we sync'd, we should update the total counts
      if (forceRefresh) this.updateStats();
    } catch { 
      this.subs = []; 
    } finally { 
      this.loading = false; 
    }
  }

  async updateStats() {
    try {
        const [active, unsub] = await Promise.all([
            this.api.getSubscriptions('active'),
            this.api.getSubscriptions('unsubscribed')
        ]);
        this.activeCount = active.subscriptions?.length || 0;
        this.unsubCount = unsub.subscriptions?.length || 0;
    } catch {}
  }

  async markUnsubscribed(sub: Sub) {
    // Optimistic UI update
    this.subs = this.subs.filter(s => s.id !== sub.id);
    this.activeCount--;
    this.unsubCount++;
    try {
        await this.api.markAsUnsubscribed(sub.id);
    } catch (e) {
        // Rollback
        await this.load();
    }
  }

  extractLink(raw: string): string {
    // List-Unsubscribe can be <mailto:xxx> or <http://xxx>
    const match = raw.match(/<(https?:\/\/[^>]+)>/);
    if (match) return match[1];
    // Fallback to the mailto link if no http found, or just return raw if it's already a link
    const mailto = raw.match(/<(mailto:[^>]+)>/);
    if (mailto) return mailto[1];
    return raw.replace(/[<>]/g, '').split(',')[0].trim();
  }

  displayName(raw: string) {
    if (!raw) return 'Unknown';
    const i = raw.indexOf('<');
    return i === -1 ? raw : raw.slice(0, i).trim() || raw;
  }

  senderEmail(raw: string) {
    if (!raw) return '';
    const m = raw.match(/<(.+)>/);
    return m ? m[1] : raw;
  }
}
