import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="page-bg min-h-screen">
      <nav class="site-nav">
        <button class="nav-logo" (click)="router.navigate(['/'])">TrueAuth</button>
        <div class="nav-links">
          <button class="nav-link" (click)="router.navigate(['/about'])">About</button>
          <button class="nav-link" (click)="router.navigate(['/privacy'])">Privacy</button>
          <button class="nav-link cta" (click)="router.navigate(['/login'])">Sign in</button>
          <button class="theme-btn" (click)="theme.toggle()" title="Toggle theme">
             <lucide-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" [size]="18"></lucide-icon>
          </button>
        </div>
      </nav>

      <main class="privacy-main">
        <div class="privacy-header">
          <div class="hero-badge">Legal</div>
          <h1 class="privacy-title">Privacy Policy</h1>
          <p class="privacy-meta">Last updated: April 2025</p>
        </div>

        <div class="privacy-body">
          <div class="policy-section" *ngFor="let s of sections">
            <h2>{{ s.title }}</h2>
            <p *ngFor="let p of s.paragraphs">{{ p }}</p>
          </div>
        </div>
      </main>

      <footer class="site-footer">
        <span>© 2025 TrueAuth</span>
        <button class="footer-link" (click)="router.navigate(['/privacy'])">Privacy Policy</button>
        <button class="footer-link" (click)="router.navigate(['/about'])">About</button>
      </footer>
    </div>
  `,
  styles: [`
    .page-bg { background: var(--bg); color: var(--text-primary); }
    .site-nav { display: flex; align-items: center; justify-content: space-between; padding: 1rem 2rem; border-bottom: 1px solid var(--border); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 50; background: var(--nav-bg); }
    .nav-logo { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.03em; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; cursor: pointer; border: none; background-clip: text; }
    .nav-links { display: flex; align-items: center; gap: 0.5rem; }
    .nav-link { background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 0.5rem 0.75rem; border-radius: 0.5rem; font-size: 0.9rem; transition: all 0.2s; }
    .nav-link:hover { color: var(--text-primary); background: var(--surface); }
    .nav-link.cta { background: var(--accent); color: white; padding: 0.5rem 1.25rem; font-weight: 600; }
    .theme-btn { background: var(--surface); border: 1px solid var(--border); border-radius: 0.5rem; cursor: pointer; padding: 0.5rem; display: flex; align-items: center; justify-content: center; }
    .privacy-main { max-width: 760px; margin: 0 auto; padding: 4rem 2rem; }
    .privacy-header { margin-bottom: 3rem; }
    .hero-badge { display: inline-block; padding: 0.25rem 0.9rem; border-radius: 99px; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; background: var(--accent-subtle); color: var(--accent); margin-bottom: 1rem; }
    .privacy-title { font-size: clamp(2rem, 5vw, 3rem); font-weight: 800; margin: 0 0 0.5rem; letter-spacing: -0.03em; }
    .privacy-meta { color: var(--text-secondary); font-size: 0.9rem; }
    .privacy-body { }
    .policy-section { margin-bottom: 2.5rem; padding-bottom: 2.5rem; border-bottom: 1px solid var(--border); }
    .policy-section:last-child { border-bottom: none; }
    .policy-section h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem; }
    .policy-section p { color: var(--text-secondary); line-height: 1.75; margin-bottom: 0.75rem; }
    .site-footer { display: flex; align-items: center; justify-content: center; gap: 1.5rem; padding: 2rem; border-top: 1px solid var(--border); color: var(--text-secondary); font-size: 0.85rem; }
    .footer-link { background: none; border: none; cursor: pointer; color: var(--text-secondary); text-decoration: underline; font-size: 0.85rem; }
    .footer-link:hover { color: var(--accent); }
  `]
})
export class PrivacyComponent {
  router = inject(Router);
  theme = inject(ThemeService);

  sections = [
    {
      title: '1. Information We Collect',
      paragraphs: [
        'TrueAuth requests access to your Gmail and Google Calendar via OAuth 2.0. We only read email metadata and content that is necessary to perform the requested action (e.g., listing subscriptions or detecting meeting times).',
        'We store your Google OAuth access tokens and refresh tokens securely in our database to enable background job processing. These tokens are scoped specifically to the permissions you grant.'
      ]
    },
    {
      title: '2. How We Use Your Information',
      paragraphs: [
        'Your email content is processed in-memory and is never written to our servers or databases. We use it only to compute results (e.g., subscription list, AI draft) and return that result to you.',
        'OAuth tokens are used solely to make API calls on your behalf to Google services. They are never shared with third parties.'
      ]
    },
    {
      title: '3. Data Retention',
      paragraphs: [
        'We retain OAuth tokens only as long as your account is active. You can revoke access at any time via your Google Account settings (myaccount.google.com/permissions).',
        'Cleanup action audit logs (message IDs and timestamps) are retained for 60 days to allow undo functionality, then automatically deleted.'
      ]
    },
    {
      title: '4. Third-Party Services',
      paragraphs: [
        'TrueAuth uses Supabase (database and authentication), Google APIs (Gmail and Calendar), and Google Gemini (AI features). Each of these services has its own privacy policy.',
        'We do not use advertising networks and never sell your data.'
      ]
    },
    {
      title: '5. Security',
      paragraphs: [
        'All communication between TrueAuth and Google APIs uses HTTPS. OAuth tokens are stored encrypted at rest in our Supabase database.',
        'Our backend validates every request with Supabase JWT authentication to ensure only you can access your data.'
      ]
    },
    {
      title: '6. Contact',
      paragraphs: [
        'For any privacy concerns, please reach out to us at privacy@trueauth.dev. We will respond within 72 hours.'
      ]
    }
  ];
}
