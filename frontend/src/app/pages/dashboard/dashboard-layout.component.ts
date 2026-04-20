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
    <div class="layout-container">
      <!-- Mobile Header -->
      <header class="mobile-header">
        <div class="mobile-logo-group" (click)="router.navigate(['/dashboard/summary'])">
          <img src="assets/logo.png" alt="TrueAuth Logo" class="mobile-main-logo">
          <span class="mobile-brand">TrueAuth</span>
        </div>
        <button class="mobile-menu-toggle" (click)="toggleMobileMenu()" aria-label="Toggle Menu">
          <lucide-icon [name]="mobileMenuOpen ? 'x' : 'menu'" [size]="24"></lucide-icon>
        </button>
      </header>

      <div class="dash-shell">
        <!-- Sidebar -->
        <aside class="sidebar" 
               [class.collapsed]="collapsed" 
               [class.mobile-open]="mobileMenuOpen">
          
          <!-- Desktop Header -->
          <div class="sidebar-header hide-mobile">
            <div class="sidebar-logo" (click)="router.navigate(['/dashboard/summary'])">
              <img src="assets/logo.png" alt="TrueAuth Logo" class="main-logo">
              <span *ngIf="!collapsed">TrueAuth</span>
            </div>
            <button class="desktop-collapse-btn" (click)="collapsed = !collapsed" [title]="collapsed ? 'Expand' : 'Collapse'">
              <lucide-icon [name]="collapsed ? 'chevron-right' : 'chevron-left'" [size]="16"></lucide-icon>
            </button>
          </div>

          <!-- User Section -->
          <div class="user-profile-section" *ngIf="(!collapsed || mobileMenuOpen) && email">
            <div class="avatar-circle">{{ initial }}</div>
            <div class="user-details">
              <span class="user-email-text">{{ email }}</span>
            </div>
          </div>

          <!-- Navigation -->
          <nav class="navigation-links">
            <button
              *ngFor="let item of navItems"
              class="nav-link-btn"
              [class.is-active]="router.url.startsWith(item.route)"
              (click)="router.navigate([item.route]); toggleMobileMenu(false)"
              [title]="item.label"
            >
              <span class="nav-link-icon">
                <lucide-icon [name]="item.icon" [size]="20"></lucide-icon>
              </span>
              <span class="nav-link-label" *ngIf="!collapsed || mobileMenuOpen">{{ item.label }}</span>
            </button>
          </nav>

          <!-- Footer Actions -->
          <div class="sidebar-actions-footer">
            <button class="nav-link-btn" (click)="theme.toggle()" title="Toggle theme">
              <span class="nav-link-icon">
                <lucide-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" [size]="20"></lucide-icon>
              </span>
              <span class="nav-link-label" *ngIf="!collapsed || mobileMenuOpen">
                {{ theme.theme() === 'dark' ? 'Light mode' : 'Dark mode' }}
              </span>
            </button>
            
            <button class="nav-link-btn text-red" (click)="purgeData()" title="Purge My Data" *ngIf="!collapsed || mobileMenuOpen">
              <span class="nav-link-icon">
                <lucide-icon name="user-x" [size]="20"></lucide-icon>
              </span>
              <span class="nav-link-label" *ngIf="!collapsed || mobileMenuOpen">Purge My Data</span>
            </button>

            <button class="nav-link-btn" (click)="signOut()" title="Sign out">
              <span class="nav-link-icon">
                <lucide-icon name="log-out" [size]="20"></lucide-icon>
              </span>
              <span class="nav-link-label" *ngIf="!collapsed || mobileMenuOpen">Sign out</span>
            </button>
          </div>
        </aside>

        <!-- Overlay -->
        <div class="mobile-sidebar-overlay" *ngIf="mobileMenuOpen" (click)="toggleMobileMenu(false)"></div>

        <!-- Main Display -->
        <main class="main-viewport">
          <header class="main-top-navbar hide-mobile">
            <h1 class="page-current-title">{{ currentTitle }}</h1>
            <div class="navbar-right-utils">
               <div class="live-timestamp">{{ now | date:'EEE, MMM d · h:mm a' }}</div>
            </div>
          </header>
          
          <div class="viewport-scroller">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; width: 100%; overflow: hidden; }
    
    .layout-container { position: relative; height: 100%; width: 100%; display: flex; flex-direction: column; }
    
    .dash-shell { display: flex; flex: 1; height: 100%; background: var(--bg); overflow: hidden; }

    /* Mobile Header - Always Above Everything on Small Screens */
    .mobile-header { 
      display: none; height: 60px; background: var(--surface); 
      border-bottom: 2px solid var(--border); width: 100%;
      align-items: center; justify-content: space-between; padding: 0 1rem;
      flex-shrink: 0; z-index: 500;
    }
    .mobile-logo-group { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
    .mobile-main-logo { height: 24px; width: auto; }
    .mobile-brand { font-size: 1.1rem; font-weight: 900; color: var(--text-primary); letter-spacing: -0.05em; }
    .mobile-menu-toggle { 
      background: var(--accent-subtle); border: none; color: var(--accent); 
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
    }

    /* Sidebar Foundation */
    .sidebar {
      display: flex; flex-direction: column;
      width: 240px; min-width: 240px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 400; position: relative;
    }
    .sidebar.collapsed { width: 72px; min-width: 72px; }

    .sidebar-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 1.25rem; height: 64px; border-bottom: 1px solid var(--border);
    }
    .sidebar-logo { display: flex; align-items: center; gap: 0.75rem; font-weight: 800; cursor: pointer; }
    .main-logo { height: 30px; width: auto; }
    .desktop-collapse-btn { 
      background: none; border: 1px solid var(--border); border-radius: 6px; 
      padding: 4px; color: var(--text-secondary); cursor: pointer;
    }

    .user-profile-section {
      display: flex; align-items: center; gap: 0.75rem;
      margin: 1rem; padding: 0.75rem;
      background: var(--surface2); border: 1px solid var(--border); border-radius: 12px;
    }
    .avatar-circle {
      width: 32px; height: 32px; border-radius: 50%; 
      background: var(--accent); color: white;
      display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;
    }
    .user-email-text { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .navigation-links { flex: 1; padding: 0.75rem; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
    .nav-link-btn {
      display: flex; align-items: center; gap: 0.8rem;
      padding: 0.7rem 0.8rem; border-radius: 10px;
      cursor: pointer; border: none; background: none;
      color: var(--text-secondary); font-size: 0.9rem; font-weight: 500;
      transition: all 0.2s; width: 100%; text-align: left;
    }
    .nav-link-btn:hover { background: var(--surface2); color: var(--text-primary); }
    .nav-link-btn.is-active { background: var(--accent-subtle); color: var(--accent); font-weight: 700; }
    .nav-link-btn.text-red { color: var(--danger); }
    .nav-link-icon { flex-shrink: 0; }

    .sidebar-actions-footer { padding: 0.75rem; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; }

    /* Main Viewport */
    .main-viewport { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }
    .main-top-navbar { height: 64px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; flex-shrink: 0; }
    .page-current-title { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }
    .live-timestamp { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    
    .viewport-scroller { flex: 1; overflow-y: auto; padding: 2rem; }

    .mobile-sidebar-overlay { 
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); 
      z-index: 350; backdrop-filter: blur(5px);
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .hide-mobile { display: flex !important; }

    @media (max-width: 1024px) {
      .mobile-header { display: flex !important; }
      .sidebar { 
        position: fixed; transform: translateX(-100%); 
        top: 0; bottom: 0; left: 0; 
        height: 100vh; width: 300px;
        box-shadow: 20px 0 60px rgba(0,0,0,0.3);
        z-index: 1000; visibility: hidden;
      }
      .sidebar.mobile-open { transform: translateX(0); visibility: visible; }
      .hide-mobile { display: none !important; }
      .viewport-scroller { padding: 1.25rem; }
      /* No padding-top needed if flex column is used */
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
