import { Injectable, signal, inject } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private api = inject(ApiService);

  isPremium = signal<boolean>(false);
  planLoaded = signal<boolean>(false);
  planExpiry = signal<string>('');

  async refreshPlan() {
    try {
      const res = await this.api.getPlan();
      this.isPremium.set(res.plan === 'premium');
      this.planExpiry.set(res.expires_at || '');
    } catch (e) {
      console.error('Failed to load plan', e);
      this.isPremium.set(false);
    } finally {
      this.planLoaded.set(true);
    }
  }

  async purchasePremium() {
    try {
      const res = await this.api.purchasePremium();
      this.isPremium.set(true);
      this.planExpiry.set(res.expires_at || '');
      return res;
    } catch (e) {
      console.error('Purchase failed', e);
      throw e;
    }
  }
}
