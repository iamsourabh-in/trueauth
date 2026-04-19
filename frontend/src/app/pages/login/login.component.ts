import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService } from '../../services/theme.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <!-- Animated gradient background -->
    <div class="gradient-bg"><div class="blob3"></div></div>

    <!-- Navbar -->
    <nav class="login-nav">
      <span class="nav-wordmark" (click)="router.navigate(['/'])">TrueAuth</span>
      <div style="display:flex;align-items:center;gap:.5rem;">
        <button class="nav-ghost" (click)="router.navigate(['/about'])">About</button>
        <button class="nav-ghost" (click)="router.navigate(['/privacy'])">Privacy</button>
        <button class="theme-toggle" (click)="theme.toggle()" [title]="theme.theme() === 'dark' ? 'Switch to light' : 'Switch to dark'">
           <lucide-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" [size]="18"></lucide-icon>
        </button>
      </div>
    </nav>

    <!-- Main content -->
    <div class="login-page">
      <div class="login-split">

        <!-- Left: Value prop -->
        <div class="login-left anim-card">
          <div class="pill-row">
            <span class="feature-pill">✨ AI-Powered</span>
            <span class="feature-pill">🔐 OAuth Only</span>
            <span class="feature-pill">⚡ Real-time</span>
          </div>
          <h2 class="value-heading">Your inbox,<br><span class="gradient-text">finally under control.</span></h2>
          <p class="value-sub">TrueAuth scans your Gmail, kills junk subscriptions, drafts replies in your tone, and syncs meetings to your calendar — all powered by Gemini AI.</p>

          <div class="stat-pills">
            <div class="stat-item" *ngFor="let s of stats">
              <span class="stat-n">{{ s.n }}</span>
              <span class="stat-l">{{ s.l }}</span>
            </div>
          </div>
        </div>

        <!-- Right: Login card -->
        <div class="login-right">
          <div class="glass-card login-card">
            <!-- Logo -->
            <div class="logo-wrap anim-logo">
              <div class="logo-icon" [class.pulse]="!busy">
                 <lucide-icon name="mail" [size]="28" color="white"></lucide-icon>
              </div>
            </div>

            <h1 class="card-title anim-title">Sign in to TrueAuth</h1>
            <p class="card-sub anim-sub">Connect your Google account to start cleaning your inbox with AI.</p>

            <!-- Google sign in button -->
            <button
              id="btn-google-signin"
              class="google-btn anim-btn"
              type="button"
              (click)="login()"
              [disabled]="busy"
            >
              <span class="spinner" *ngIf="busy; else googleIcon"></span>
              <ng-template #googleIcon>
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </ng-template>
              <span>{{ busy ? 'Redirecting to Google…' : 'Continue with Google' }}</span>
            </button>

            <p class="card-legal anim-foot">
              By continuing you agree to our
              <button class="inline-link" (click)="router.navigate(['/privacy'])">Privacy Policy</button>
              and
              <button class="inline-link" (click)="router.navigate(['/about'])">Terms of Use</button>.
            </p>

            <div class="divider anim-foot">
              <span>Setup hint</span>
            </div>
            <p class="hint-text anim-foot">
              Add <code>{{ origin }}/dashboard/inbox</code> to Supabase Auth → URL Configuration → Redirect URLs.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="login-footer">
      <span>© 2025 TrueAuth</span>
      <button class="footer-link" (click)="router.navigate(['/privacy'])">Privacy</button>
      <button class="footer-link" (click)="router.navigate(['/about'])">About</button>
    </footer>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; position: relative; }

    .login-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.9rem 2rem;
      background: var(--nav-bg); backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
    }
    .nav-wordmark {
      font-size: 1.2rem; font-weight: 800; letter-spacing: -0.04em;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      cursor: pointer;
    }
    .nav-ghost {
      background: none; border: none; cursor: pointer; color: var(--text-secondary);
      font-size: 0.88rem; padding: 0.4rem 0.7rem; border-radius: 0.5rem; transition: all .2s;
    }
    .nav-ghost:hover { color: var(--text-primary); background: var(--surface2); }
    .theme-toggle {
      background: var(--surface); border: 1px solid var(--border); border-radius: 0.5rem;
      cursor: pointer; padding: 0.5rem; display: flex; align-items: center; justify-content: center; transition: all .2s;
    }
    .theme-toggle:hover { border-color: var(--accent); }

    .login-page {
      position: relative; z-index: 1;
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 6rem 1.5rem 4rem;
    }
    .login-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4rem; align-items: center;
      max-width: 960px; width: 100%;
    }
    @media (max-width: 768px) {
      .login-split { grid-template-columns: 1fr; gap: 2rem; }
      .login-left { text-align: center; }
      .pill-row { justify-content: center; }
      .stat-pills { justify-content: center; }
    }

    .login-left { }
    .pill-row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }

    .value-heading {
      font-size: clamp(2rem, 4vw, 3rem); font-weight: 900;
      line-height: 1.15; letter-spacing: -0.04em;
      color: var(--text-primary); margin-bottom: 1.25rem;
    }
    .gradient-text {
      background: linear-gradient(135deg, var(--accent), var(--accent2), #ec4899);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .value-sub {
      font-size: 1rem; color: var(--text-secondary);
      line-height: 1.75; max-width: 420px; margin-bottom: 2rem;
    }
    .stat-pills { display: flex; gap: 1.5rem; flex-wrap: wrap; }
    .stat-item { display: flex; flex-direction: column; gap: 0.1rem; }
    .stat-n { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); }
    .stat-l { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }

    .login-card {
      padding: 2.5rem;
      display: flex; flex-direction: column; align-items: center; gap: 0;
    }

    .logo-wrap { margin-bottom: 1.5rem; }
    .logo-icon {
      width: 60px; height: 60px; border-radius: 1rem;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 24px var(--shadow);
    }
    .logo-icon.pulse { animation: pulse-ring 2.5s ease-in-out infinite; }

    .card-title {
      font-size: 1.5rem; font-weight: 800;
      letter-spacing: -0.03em; color: var(--text-primary);
      margin-bottom: 0.5rem; text-align: center;
    }
    .card-sub {
      font-size: 0.9rem; color: var(--text-secondary);
      text-align: center; line-height: 1.5; margin-bottom: 2rem;
    }

    .google-btn { margin-bottom: 1.25rem; }

    .card-legal {
      font-size: 0.78rem; color: var(--text-muted);
      text-align: center; line-height: 1.5; margin-bottom: 1.5rem;
    }
    .inline-link {
      background: none; border: none; cursor: pointer;
      color: var(--accent); font-size: inherit; text-decoration: underline;
    }

    .divider {
      width: 100%; display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;
    }
    .divider::before, .divider::after {
      content: ''; flex: 1; height: 1px; background: var(--border);
    }
    .divider span { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; }

    .hint-text {
      font-size: 0.75rem; color: var(--text-muted); text-align: center; line-height: 1.5;
    }
    .hint-text code {
      background: var(--surface2); color: var(--accent);
      padding: 0.1em 0.35em; border-radius: 0.25rem; font-size: 0.85em;
    }

    .login-footer {
      position: relative; z-index: 1;
      display: flex; align-items: center; justify-content: center; gap: 1.5rem;
      padding: 1.5rem; color: var(--text-muted); font-size: 0.8rem;
    }
    .footer-link {
      background: none; border: none; cursor: pointer; color: var(--text-muted);
      font-size: 0.8rem; text-decoration: underline;
    }
    .footer-link:hover { color: var(--accent); }
  `]
})
export class LoginComponent implements OnDestroy {
  supabase = inject(SupabaseService);
  router = inject(Router);
  theme = inject(ThemeService);
  private sub?: Subscription;

  busy = false;
  origin = typeof window !== 'undefined' ? window.location.origin : '';

  stats = [
    { n: '10k+', l: 'Emails cleaned' },
    { n: '< 2s', l: 'Avg scan time' },
    { n: '100%', l: 'OAuth secure' },
  ];

  constructor() {
    this.sub = this.supabase.user.subscribe((user) => {
      if (user) this.router.navigate(['/dashboard/inbox']);
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  async login() {
    this.busy = true;
    try {
      await this.supabase.signInWithGoogle();
    } catch {
      this.busy = false;
    }
  }
}
