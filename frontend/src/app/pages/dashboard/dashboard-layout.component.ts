import { Component, inject, DestroyRef, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';

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
      <!-- Sidebar -->
      <aside class="sidebar" [class.collapsed]="collapsed">
        <!-- Logo -->
        <div class="sidebar-header">
          <div class="sidebar-logo" *ngIf="!collapsed">
            <div class="logo-dot"></div>
            <span>TrueAuth</span>
          </div>
          <button class="collapse-btn" (click)="collapsed = !collapsed" [title]="collapsed ? 'Expand' : 'Collapse'">
            <lucide-icon [name]="collapsed ? 'chevron-right' : 'chevron-left'" [size]="16"></lucide-icon>
          </button>
        </div>

        <!-- User pill -->
        <div class="user-pill" *ngIf="!collapsed && email">
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
            (click)="router.navigate([item.route])"
            [title]="item.label"
          >
            <span class="nav-icon">
              <lucide-icon [name]="item.icon" [size]="18"></lucide-icon>
            </span>
            <span class="nav-label" *ngIf="!collapsed">{{ item.label }}</span>
          </button>
        </nav>

        <!-- Bottom -->
        <div class="sidebar-footer">
          <button class="nav-item" (click)="theme.toggle()" title="Toggle theme">
            <span class="nav-icon">
              <lucide-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" [size]="18"></lucide-icon>
            </span>
            <span class="nav-label" *ngIf="!collapsed">
              {{ theme.theme() === 'dark' ? 'Light mode' : 'Dark mode' }}
            </span>
          </button>
          
          <button class="nav-item danger" (click)="purgeData()" title="Purge My Data" *ngIf="!collapsed">
            <span class="nav-icon">
              <lucide-icon name="user-x" [size]="18"></lucide-icon>
            </span>
            <span class="nav-label">Purge My Data</span>
          </button>

          <button class="nav-item" (click)="signOut()" title="Sign out">
            <span class="nav-icon">
              <lucide-icon name="log-out" [size]="18"></lucide-icon>
            </span>
            <span class="nav-label" *ngIf="!collapsed">Sign out</span>
          </button>
        </div>
      </aside>

      <!-- Main -->
      <main class="dash-main">
        <header class="dash-topbar">
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
    .dash-shell { display: flex; height: 100vh; overflow: hidden; background: var(--bg); }

    .sidebar {
      display: flex; flex-direction: column;
      width: 224px; min-width: 224px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      transition: width 0.22s ease, min-width 0.22s ease;
      overflow: hidden;
    }
    .sidebar.collapsed { width: 60px; min-width: 60px; }

    .sidebar-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 0.75rem; height: 58px; border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .sidebar-logo {
      display: flex; align-items: center; gap: 0.45rem;
      font-size: 1.05rem; font-weight: 800; letter-spacing: -0.04em;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      white-space: nowrap;
    }
    .logo-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), var(--accent2)); flex-shrink: 0;
    }
    .collapse-btn {
      background: none; border: 1px solid var(--border); border-radius: 0.375rem;
      cursor: pointer; padding: 0.28rem; color: var(--text-secondary);
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s; flex-shrink: 0; margin-left: auto;
    }
    .collapse-btn:hover { background: var(--surface2); color: var(--text-primary); }

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

    .sidebar-nav { flex: 1; padding: 0.5rem; display: flex; flex-direction: column; gap: 1px; overflow-y: auto; overflow-x: hidden; }

    .nav-item {
      display: flex; align-items: center; gap: 0.7rem;
      padding: 0.58rem 0.7rem; border-radius: 0.6rem;
      cursor: pointer; border: none; background: none;
      color: var(--text-secondary); font-size: 0.875rem; font-weight: 500;
      text-align: left; width: 100%; transition: all 0.14s ease;
      white-space: nowrap; text-decoration: none; flex-shrink: 0;
    }
    .nav-item:hover { background: var(--surface2); color: var(--text-primary); }
    .nav-item.active { background: var(--accent-subtle); color: var(--accent); font-weight: 600; }
    .nav-item.danger:hover { background: rgba(239,68,68,0.08); color: var(--danger); }

    .nav-icon { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .nav-label { flex: 1; }

    .sidebar-footer { padding: 0.5rem; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 1px; }

    /* Main */
    .dash-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

    .dash-topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 1.5rem; height: 58px; min-height: 58px;
      border-bottom: 1px solid var(--border); background: var(--surface); flex-shrink: 0;
    }
    .topbar-title { font-size: 0.975rem; font-weight: 700; color: var(--text-primary); }
    .topbar-right { display: flex; align-items: center; gap: 1rem; }
    .topbar-time { font-size: 0.78rem; color: var(--text-secondary); }

    .dash-content { flex: 1; overflow-y: auto; padding: 1.5rem; }
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

  navItems: NavItem[] = [
    { label: 'Overview', route: '/dashboard/summary', icon: 'layout' },
    { label: 'Inbox', route: '/dashboard/inbox', icon: 'inbox' },
    { label: 'Subscriptions', route: '/dashboard/subscriptions', icon: 'bell' },
    { label: 'Cleanup Rules', route: '/dashboard/cleanup', icon: 'trash-2' },
    { label: 'AI Draft', route: '/dashboard/draft', icon: 'pen-box' },
    { label: 'Calendar', route: '/dashboard/calendar', icon: 'calendar' },
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
  }

  async ngOnInit() {
    try {
      await this.api.syncGoogleTokensFromSession();
    } catch (e) {
      console.error('Failed to sync Google tokens from session', e);
    }
  }

  async purgeData() {
    if (!confirm('Are you sure you want to permanently delete ALL your data from TrueAuth? This includes all synced emails, subscriptions, and logs. This action cannot be undone.')) {
      return;
    }

    try {
      await this.api.purgeData();
      alert('Your data has been successfully deleted. You will now be signed out.');
      await this.signOut();
    } catch (e) {
      alert('Failed to delete data. Please try again later.');
    }
  }

  async signOut() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
