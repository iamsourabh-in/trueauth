import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLinkActive } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService } from '../../services/theme.service';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLinkActive],
  template: `
    <div class="dash-shell">
      <!-- Sidebar -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed">
        <!-- Logo -->
        <div class="sidebar-header">
          <div class="sidebar-logo" *ngIf="!sidebarCollapsed">
            <div class="logo-dot"></div>
            <span>TrueAuth</span>
          </div>
          <button class="collapse-btn" (click)="sidebarCollapsed = !sidebarCollapsed" title="Toggle sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path *ngIf="!sidebarCollapsed" d="M15 18l-6-6 6-6"/>
              <path *ngIf="sidebarCollapsed"  d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        <!-- User pill -->
        <div class="user-pill" *ngIf="!sidebarCollapsed && email">
          <div class="user-avatar">{{ initial }}</div>
          <div class="user-info">
            <span class="user-email">{{ email }}</span>
          </div>
        </div>

        <!-- Nav -->
        <nav class="sidebar-nav">
          <a
            *ngFor="let item of navItems"
            class="nav-item"
            [class.active]="isActive(item.route)"
            (click)="navigate(item.route)"
            [title]="item.label"
          >
            <span class="nav-icon" [innerHTML]="item.icon"></span>
            <span class="nav-label" *ngIf="!sidebarCollapsed">{{ item.label }}</span>
          </a>
        </nav>

        <!-- Bottom actions -->
        <div class="sidebar-footer">
          <button class="nav-item" (click)="theme.toggle()" [title]="'Switch theme'">
            <span class="nav-icon">{{ theme.theme() === 'dark' ? '☀️' : '🌙' }}</span>
            <span class="nav-label" *ngIf="!sidebarCollapsed">{{ theme.theme() === 'dark' ? 'Light mode' : 'Dark mode' }}</span>
          </button>
          <button class="nav-item danger" (click)="signOut()" title="Sign out">
            <span class="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </span>
            <span class="nav-label" *ngIf="!sidebarCollapsed">Sign out</span>
          </button>
        </div>
      </aside>

      <!-- Main -->
      <main class="dash-main">
        <!-- Top bar -->
        <header class="dash-topbar">
          <div class="topbar-left">
            <h2 class="topbar-title">{{ currentTitle }}</h2>
          </div>
          <div class="topbar-right">
            <div class="topbar-time">{{ now | date:'EEE, MMM d · h:mm a' }}</div>
          </div>
        </header>

        <!-- Routed content -->
        <div class="dash-content">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dash-shell { display: flex; height: 100vh; overflow: hidden; background: var(--bg); }

    /* ── Sidebar ───────────────────────────── */
    .sidebar {
      display: flex; flex-direction: column;
      width: 240px; min-width: 240px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      transition: width 0.25s ease, min-width 0.25s ease;
      overflow: hidden;
    }
    .sidebar.collapsed { width: 64px; min-width: 64px; }

    .sidebar-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.1rem 1rem; border-bottom: 1px solid var(--border);
      min-height: 60px;
    }
    .sidebar-logo {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 1.1rem; font-weight: 800; letter-spacing: -0.04em;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .logo-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      flex-shrink: 0;
    }
    .collapse-btn {
      background: none; border: 1px solid var(--border); border-radius: 0.375rem;
      cursor: pointer; padding: 0.3rem; color: var(--text-secondary);
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s; flex-shrink: 0; margin-left: auto;
    }
    .collapse-btn:hover { background: var(--surface2); color: var(--text-primary); }

    .user-pill {
      display: flex; align-items: center; gap: 0.65rem;
      padding: 0.75rem 1rem; margin: 0.5rem; border-radius: 0.75rem;
      background: var(--surface2); border: 1px solid var(--border);
      overflow: hidden;
    }
    .user-avatar {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      color: white; font-size: 0.8rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .user-info { overflow: hidden; }
    .user-email { font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 140px; }

    .sidebar-nav {
      flex: 1; padding: 0.5rem; display: flex; flex-direction: column; gap: 2px;
      overflow-y: auto; overflow-x: hidden;
    }

    .nav-item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.6rem 0.75rem; border-radius: 0.625rem;
      cursor: pointer; border: none; background: none;
      color: var(--text-secondary); font-size: 0.875rem; font-weight: 500;
      text-align: left; width: 100%; transition: all 0.15s ease;
      white-space: nowrap; text-decoration: none;
    }
    .nav-item:hover { background: var(--surface2); color: var(--text-primary); }
    .nav-item.active {
      background: var(--accent-subtle); color: var(--accent);
      font-weight: 600;
    }
    .nav-item.danger:hover { background: rgba(239,68,68,0.08); color: var(--danger); }

    .nav-icon {
      width: 20px; height: 20px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem;
    }
    .nav-icon svg { width: 18px; height: 18px; }
    .nav-label { flex: 1; }

    .sidebar-footer {
      padding: 0.5rem; border-top: 1px solid var(--border);
      display: flex; flex-direction: column; gap: 2px;
    }

    /* ── Main ──────────────────────────────── */
    .dash-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

    .dash-topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 1.75rem; height: 60px; min-height: 60px;
      border-bottom: 1px solid var(--border);
      background: var(--surface); flex-shrink: 0;
    }
    .topbar-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
    .topbar-time { font-size: 0.8rem; color: var(--text-secondary); }
    .topbar-right { display: flex; align-items: center; gap: 1rem; }

    .dash-content { flex: 1; overflow-y: auto; padding: 1.75rem; }
  `]
})
export class DashboardLayoutComponent {
  router   = inject(Router);
  supabase = inject(SupabaseService);
  theme    = inject(ThemeService);
  private destroyRef = inject(DestroyRef);

  email    = '';
  initial  = '';
  now      = new Date();
  sidebarCollapsed = false;

  navItems: NavItem[] = [
    { label: 'Inbox Overview',  route: '/dashboard/inbox',         icon: this.inboxIcon() },
    { label: 'Subscriptions',   route: '/dashboard/subscriptions', icon: this.subIcon() },
    { label: 'Cleanup Rules',   route: '/dashboard/cleanup',       icon: this.cleanIcon() },
    { label: 'AI Draft',        route: '/dashboard/draft',         icon: this.draftIcon() },
    { label: 'Calendar',        route: '/dashboard/calendar',      icon: this.calIcon() },
  ];

  get currentTitle() {
    const cur = this.navItems.find(n => this.router.url.startsWith(n.route));
    return cur?.label ?? 'Dashboard';
  }

  constructor() {
    setInterval(() => this.now = new Date(), 30_000);
    this.supabase.user.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(u => {
      this.email   = u?.email ?? u?.user_metadata?.['email'] ?? '';
      this.initial = this.email.charAt(0).toUpperCase();
    });
  }

  isActive(route: string) { return this.router.url.startsWith(route); }
  navigate(route: string) { this.router.navigate([route]); }

  async signOut() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }

  private inboxIcon()  { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9l10 6 10-6"/></svg>`; }
  private subIcon()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`; }
  private cleanIcon()  { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`; }
  private draftIcon()  { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`; }
  private calIcon()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`; }
}
