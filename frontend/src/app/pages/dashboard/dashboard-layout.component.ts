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
  template: `
    <div class="dash-shell">
      <!-- Mobile Header -->
      <header class="mobile-header">
        <div class="sidebar-logo" (click)="router.navigate(['/dashboard/summary'])">
          <img src="assets/logo.png" alt="TrueAuth Logo" class="main-logo">
          <span>TrueAuth</span>
        </div>
        <button class="hamburger-btn" (click)="toggleMobileMenu()">
          <lucide-icon [name]="mobileMenuOpen ? 'x' : 'menu'" [size]="20"></lucide-icon>
        </button>
      </header>

      <!-- Sidebar -->
      <aside class="sidebar" [class.collapsed]="collapsed" [class.mobile-open]="mobileMenuOpen">
        <!-- Logo -->
        <div class="sidebar-header hide-mobile">
          <div class="sidebar-logo" (click)="router.navigate(['/dashboard/summary'])">
            <img src="assets/logo.png" alt="TrueAuth Logo" class="main-logo">
            <span *ngIf="!collapsed">TrueAuth</span>
          </div>
          <button class="collapse-btn" (click)="collapsed = !collapsed" [title]="collapsed ? 'Expand' : 'Collapse'">
            <lucide-icon [name]="collapsed ? 'chevron-right' : 'chevron-left'" [size]="16"></lucide-icon>
          </button>
        </div>

        <!-- User pill -->
        <div class="user-pill" *ngIf="(!collapsed || mobileMenuOpen) && email">
          <div class="user-avatar">{{ initial }}</div>
          <div class="user-info">
            <span class="user-email">{{ email }}</span>
          </div>
        </div>

        <!-- Nav items -->
        <nav class="sidebar-nav">
          <button
            *ngFor="let item of navItems"
            class="nav-item"
            [class.active]="router.url.startsWith(item.route)"
            (click)="router.navigate([item.route]); toggleMobileMenu(false)"
            [title]="item.label"
          >
            <span class="nav-icon">
              <lucide-icon [name]="item.icon" [size]="18"></lucide-icon>
            </span>
            <span class="nav-label" *ngIf="!collapsed || mobileMenuOpen">{{ item.label }}</span>
          </button>
        </nav>

        <!-- Bottom -->
        <div class="sidebar-footer">
          <button class="nav-item" (click)="theme.toggle()" title="Toggle theme">
            <span class="nav-icon">
              <lucide-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" [size]="18"></lucide-icon>
            </span>
            <span class="nav-label" *ngIf="!collapsed || mobileMenuOpen">
              {{ theme.theme() === 'dark' ? 'Light mode' : 'Dark mode' }}
            </span>
          </button>
          
          <button class="nav-item danger hide-mobile" (click)="purgeData()" title="Purge My Data" *ngIf="!collapsed">
            <span class="nav-icon">
              <lucide-icon name="user-x" [size]="18"></lucide-icon>
            </span>
            <span class="nav-label">Purge My Data</span>
          </button>

          <button class="nav-item" (click)="signOut()" title="Sign out">
            <span class="nav-icon">
              <lucide-icon name="log-out" [size]="18"></lucide-icon>
            </span>
            <span class="nav-label" *ngIf="!collapsed || mobileMenuOpen">Sign out</span>
          </button>
        </div>
      </aside>

      <!-- Overlay for mobile menu -->
      <div class="sidebar-overlay" *ngIf="mobileMenuOpen" (click)="toggleMobileMenu(false)"></div>

      <!-- Main -->
      <main class="dash-main">
        <header class="dash-topbar hide-mobile">
          <h2 class="topbar-title">{{ currentTitle }}</h2>
          <div class="topbar-right">
             <div class="topbar-time">{{ now | date:'EEE, MMM d · h:mm a' }}</div>
          </div>
        </header>
        <div class="dash-content">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dash-shell { display: flex; height: 100vh; overflow: hidden; background: var(--bg); position: relative; }

    /* Mobile Header */
    .mobile-header { 
      display: none; height: 60px; background: var(--surface); 
      border-bottom: 1px solid var(--border); width: 100%;
      align-items: center; justify-content: space-between; padding: 0 1rem;
      position: absolute; top: 0; left: 0; z-index: 50;
    }
    .hamburger-btn { background: none; border: none; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; }

    .sidebar {
      display: flex; flex-direction: column;
      width: 224px; min-width: 224px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), width 0.22s ease;
      overflow: hidden; z-index: 100;
    }
    .sidebar.collapsed { width: 64px; min-width: 64px; }

    .sidebar-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 0.75rem; height: 58px; border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .sidebar-logo {
      display: flex; align-items: center; gap: 0.6rem;
      font-size: 1.1rem; font-weight: 800; letter-spacing: -0.04em;
      color: var(--text-primary);
      white-space: nowrap; cursor: pointer;
    }
    .main-logo { height: 28px; width: auto; }
    .collapse-btn {
      background: none; border: 1px solid var(--border); border-radius: 0.375rem;
      cursor: pointer; padding: 0.28rem; color: var(--text-secondary);
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s; flex-shrink: 0; margin-left: auto;
    }

    .user-pill {
      display: flex; align-items: center; gap: 0.6rem;
      margin: 0.6rem; padding: 0.6rem 0.75rem;
      background: var(--surface2); border: 1px solid var(--border); border-radius: 0.75rem;
      overflow: hidden; flex-shrink: 0;
    }
    .user-avatar {
      width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      color: white; font-size: 0.75rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .user-email { font-size: 0.72rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 130px; }

    .sidebar-nav { flex: 1; padding: 0.5rem; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
    .nav-item {
      display: flex; align-items: center; gap: 0.7rem;
      padding: 0.58rem 0.7rem; border-radius: 0.6rem;
      cursor: pointer; border: none; background: none;
      color: var(--text-secondary); font-size: 0.875rem; font-weight: 500;
      text-align: left; width: 100%; transition: all 0.14s ease;
      white-space: nowrap;
    }
    .nav-item:hover { background: var(--surface2); color: var(--text-primary); }
    .nav-item.active { background: var(--accent-subtle); color: var(--accent); font-weight: 600; }
    .nav-item.danger { color: var(--danger); }
    .nav-icon { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

    .sidebar-footer { padding: 0.5rem; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; }

    .dash-main { flex: 1; min-width: 0; display: flex; flex-direction: column; position: relative; }
    .dash-topbar { height: 58px; min-height: 58px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; }
    .topbar-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); }
    .topbar-time { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); }
    
    .dash-content { flex: 1; overflow-y: auto; padding: 1.5rem; }

    .sidebar-overlay { 
      position: fixed; inset: 0; background: rgba(0,0,0,0.4); 
      z-index: 90; backdrop-filter: blur(2px);
    }

    .hide-mobile { display: flex; }

    @media (max-width: 768px) {
      .mobile-header { display: flex; }
      .sidebar { 
        position: fixed; transform: translateX(-100%); 
        top: 0; bottom: 0; height: 100%; min-width: 260px; width: 260px;
        box-shadow: 20px 0 50px rgba(0,0,0,0.1);
      }
      .sidebar.mobile-open { transform: translateX(0); }
      .hide-mobile { display: none !important; }
      .dash-main { margin-top: 60px; }
      .dash-content { padding: 1rem; }
    }
  `]
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
    { label: 'Activity Log', route: '/dashboard/activity-log', icon: 'clipboard-check' },
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

    // Auto-close menu on route change
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
