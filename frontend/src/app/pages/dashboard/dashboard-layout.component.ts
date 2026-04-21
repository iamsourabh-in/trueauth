import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, LucideAngularModule, DatePipe],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css'
})
export class DashboardLayoutComponent implements OnInit {
  router = inject(Router);
  supabase = inject(SupabaseService);
  theme = inject(ThemeService);
  api = inject(ApiService);
  private destroyRef = inject(DestroyRef);

  email = '';
  initial = '';
  now = new Date();
  collapsed = false;
  mobileMenuOpen = false;

  navItems: NavItem[] = [
    { label: 'Overview', route: '/dashboard/summary', icon: 'layout' },
    { label: 'Inbox', route: '/dashboard/inbox', icon: 'inbox' },
    { label: 'Subscriptions', route: '/dashboard/subscriptions', icon: 'bell' },
    { label: 'Cleanup Rules', route: '/dashboard/cleanup', icon: 'trash-2' },
    { label: 'AI Draft', route: '/dashboard/draft', icon: 'pen-box' },
    { label: 'Calendar', route: '/dashboard/calendar', icon: 'calendar' },
    { label: 'Log', route: '/dashboard/activity-log', icon: 'clipboard-check' },
    { label: 'Data Removal', route: '/dashboard/data-removal', icon: 'shield-off' },
  ];

  get currentTitle() {
    return this.navItems.find(n => this.router.url.startsWith(n.route))?.label ?? 'Dashboard';
  }

  constructor() {
    setInterval(() => this.now = new Date(), 30_000);
    this.supabase.user.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(u => {
      this.email = u?.email ?? u?.user_metadata?.['email'] ?? '';
      this.initial = this.email.charAt(0).toUpperCase();
    });
    this.router.events.subscribe(() => {
      this.mobileMenuOpen = false;
    });
  }

  async ngOnInit() {
    try {
      await this.api.syncGoogleTokensFromSession();
    } catch (e) {
      console.error('Failed to sync Google tokens from session', e);
    }
  }

  toggleMobileMenu(state?: boolean) {
    this.mobileMenuOpen = state === undefined ? !this.mobileMenuOpen : state;
  }

  async purgeData() {
    if (confirm('Are you sure? This will delete all collected emails and rules!')) {
      await this.api.purgeData();
      window.location.reload();
    }
  }

  async signOut() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
