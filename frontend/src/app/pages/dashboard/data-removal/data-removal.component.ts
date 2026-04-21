import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../../services/api.service';
import { SubscriptionService } from '../../../services/subscription.service';

@Component({
  selector: 'app-data-removal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DatePipe],
  templateUrl: './data-removal.component.html',
  styleUrl: './data-removal.component.css'
})
export class DataRemovalComponent implements OnInit {
  api = inject(ApiService);
  brokers: any[] = [];
  identities: any[] = [];
  logs: any[] = [];
  syncing = false;
  subscription = inject(SubscriptionService);

  async ngOnInit() {
    if (this.subscription.isPremium()) {
      await this.loadStatus();
    }
  }

  async upgradeToPremium() {
    try {
      await this.subscription.purchasePremium();
      await this.loadStatus();
    } catch (e) {
      console.error('Purchase failed', e);
    }
  }

  async loadStatus() {
    try {
      const res = await this.api.getRemovalStatus();
      this.brokers = res.statuses || [];
      this.logs = res.logs || [];
    } catch (e) {
      console.error(e);
    }
  }

  async addIdentity(type: 'email'|'phone'|'address', value: string) {
    if (!value) return;
    try {
       await this.api.saveIdentity(type, value);
       this.identities.push({ type, value });
    } catch {}
  }

  async triggerScan() {
    this.syncing = true;
    try {
       await this.api.triggerRemoval();
       // Wait a moment for queue to process initial steps, then reload
       setTimeout(() => this.loadStatus(), 2000);
    } catch {} 
    finally { this.syncing = false; }
  }
}
