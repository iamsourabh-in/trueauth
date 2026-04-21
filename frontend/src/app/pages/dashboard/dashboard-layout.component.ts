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
    <div class="app-host">
      <!-- 1. MOBILE HEADER (Standard Priority) -->
      <header class="mobile-top-bar">
        <div class="brand-box" (click)="router.navigate(['/dashboard/summary'])">
          <img src="assets/logo.png" alt="Logo" class="mini-logo">
          <span class="brand-name">TrueAuth</span>
        </div>
        <button class="menu-trigger" (click)="toggleMobileMenu()" aria-label="Menu">
          <lucide-icon [name]="mobileMenuOpen ? 'x' : 'menu'" [size]="24"></lucide-icon>
        </button>
      </header>

      <div class="main-wrapper">
        <!-- 2. SIDEBAR (Drawer on Mobile, Sidebar on Desktop) -->
        <aside class="side-panel" 
               [class.is-collapsed]="collapsed" 
               [class.is-mobile-open]="mobileMenuOpen">
          
          <div class="side-header desktop-only">
            <div class="brand-box" (click)="router.navigate(['/dashboard/summary'])">
              <img src="assets/logo.png" alt="Logo" class="mini-logo">
              <span *ngIf="!collapsed" class="brand-name">TrueAuth</span>
            </div>
            <button class="collapse-toggle" (click)="collapsed = !collapsed">
              <lucide-icon [name]="collapsed ? 'chevron-right' : 'chevron-left'" [size]="16"></lucide-icon>
            </button>
          </div>

          <div class="user-pill-container" *ngIf="(!collapsed || mobileMenuOpen) && email">
            <div class="avatar-sm">{{ initial }}</div>
            <div class="user-meta" *ngIf="!collapsed || mobileMenuOpen">
              <div class="user-email-val">{{ email }}</div>
            </div>
          </div>

          <nav class="nav-list">
            <button
              *ngFor="let item of navItems"
              class="nav-btn"
              [class.active]="router.url.startsWith(item.route)"
              (click)="router.navigate([item.route]); toggleMobileMenu(false)"
            >
              <lucide-icon [name]="item.icon" [size]="20" class="nav-icon"></lucide-icon>
              <span class="nav-text" *ngIf="!collapsed || mobileMenuOpen">{{ item.label }}</span>
            </button>
          </nav>

          <footer class="side-footer">
            <button class="nav-btn" (click)="theme.toggle()">
              <lucide-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" [size]="20"></lucide-icon>
              <span class="nav-text" *ngIf="!collapsed || mobileMenuOpen">
                {{ theme.theme() === 'dark' ? 'Light' : 'Dark' }} Mode
              </span>
            </button>
            <button class="nav-btn danger desktop-only" (click)="purgeData()" *ngIf="!collapsed">
              <lucide-icon name="user-x" [size]="20"></lucide-icon>
              <span class="nav-text">Purge Data</span>
            </button>
            <button class="nav-btn" (click)="signOut()">
              <lucide-icon name="log-out" [size]="20"></lucide-icon>
              <span class="nav-text" *ngIf="!collapsed || mobileMenuOpen">Sign Out</span>
            </button>
          </footer>
        </aside>

        <!-- 3. MOBILE OVERLAY -->
        <div class="drawer-overlay" *ngIf="mobileMenuOpen" (click)="toggleMobileMenu(false)"></div>

        <!-- 4. CONTENT AREA -->
        <main class="content-shell">
          <header class="desktop-top-bar desktop-only">
            <h1 class="page-header-title">{{ currentTitle }}</h1>
            <span class="time-stamp">{{ now | date:'EEE, MMM d · h:mm a' }}</span>
          </header>
          
          <div class="page-container">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host { --mobile-h: 64px; --side-w: 240px; --side-w-collapsed: 72px; }
    
    .app-host { display: flex; flex-direction: column; height: 100vh; background: var(--bg); color: var(--text-primary); }
    .main-wrapper { display: flex; flex: 1; overflow: hidden; position: relative; }

    /* MOBILE FIRST HEADER (Visible by default on all small screens) */
    .mobile-top-bar {
      display: flex; height: var(--mobile-h); background: var(--surface);
      border-bottom: 2px solid var(--border); padding: 0 1rem;
      align-items: center; justify-content: space-between; z-index: 1000;
    }
    .mini-logo { height: 28px; width: auto; }
    .brand-name { font-weight: 900; font-size: 1.2rem; letter-spacing: -0.04em; margin-left: 0.5rem; }
    .menu-trigger {
      background: var(--accent-subtle); border: none; color: var(--accent);
      width: 44px; height: 44px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
    }

    /* SIDEBAR (Mobile Drawer by default) */
    .side-panel {
      position: fixed; top: 0; bottom: 0; left: 0; width: 280px;
      background: var(--surface); border-right: 1px solid var(--border);
      z-index: 2000; transform: translateX(-100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex; flex-direction: column;
    }
    .side-panel.is-mobile-open { transform: translateX(0); }

    .user-pill-container {
      display: flex; align-items: center; gap: 0.75rem; margin: 1rem;
      padding: 0.75rem; background: var(--surface2); border-radius: 12px;
    }
    .avatar-sm { 
      width: 32px; height: 32px; border-radius: 50%; background: var(--accent);
      color: white; display: flex; align-items: center; justify-content: center; font-weight: 700;
    }
    .user-email-val { font-size: 0.8rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .nav-list { flex: 1; padding: 0.5rem; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
    .nav-btn {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem;
      border: none; background: none; color: var(--text-secondary);
      border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: 500;
      width: 100%; text-align: left; transition: all 0.2s;
    }
    .nav-btn:hover { background: var(--surface2); color: var(--text-primary); }
    .nav-btn.active { background: var(--accent-subtle); color: var(--accent); font-weight: 700; }
    .nav-btn.danger { color: var(--danger); }

    .side-footer { padding: 0.5rem; border-top: 1px solid var(--border); }

    .drawer-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      z-index: 1500; backdrop-filter: blur(4px);
    }

    .content-shell { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .page-container { flex: 1; overflow-y: auto; padding: 1.25rem; }

    .desktop-only { display: none !important; }

    /* DESKTOP REFINEMENTS (min-width: 1025px) */
    @media (min-width: 1025px) {
      .mobile-top-bar { display: none !important; }
      .desktop-only { display: flex !important; }
      .side-panel {
        position: relative; transform: none; width: var(--side-w); min-width: var(--side-w);
        z-index: 10;
      }
      .side-panel.is-collapsed { width: var(--side-w-collapsed); min-width: var(--side-w-collapsed); }
      .side-panel.is-collapsed .nav-text, 
      .side-panel.is-collapsed .user-meta { display: none; }

      .side-header {
        height: 64px; border-bottom: 1px solid var(--border); padding: 0 1rem;
        display: flex; align-items: center; justify-content: space-between;
      }
      .collapse-toggle {
        background: none; border: 1px solid var(--border); border-radius: 6px;
        padding: 4px; color: var(--text-secondary); cursor: pointer;
      }

      .desktop-top-bar {
        height: 64px; background: var(--surface); border-bottom: 1px solid var(--border);
        display: flex; align-items: center; justify-content: space-between; padding: 0 2rem;
      }
      .page-header-title { font-size: 1.1rem; font-weight: 800; }
      .time-stamp { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
      .page-container { padding: 2rem; }
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
