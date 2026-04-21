import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css'
})
export class PricingComponent {
  router = inject(Router);
  theme = inject(ThemeService);

  freeFeatures = [
    'Gmail inbox integration',
    'AI email categorisation',
    'Subscription tracking',
    'AI Draft replies',
    'Calendar sync',
    'Up to 500 emails scanned'
  ];

  premiumFeatures = [
    'Everything in Free',
    'Cleanup Rules (archive, delete, purge)',
    'Custom Bulk Delete with filters',
    'Automated Data Removal (CCPA)',
    'Activity & Audit Logs',
    'Recurring data broker scans',
    'Priority support'
  ];
}
