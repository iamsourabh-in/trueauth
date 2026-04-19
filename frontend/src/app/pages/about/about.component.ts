import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-bg min-h-screen">
      <nav class="site-nav">
        <button class="nav-logo" (click)="router.navigate(['/'])">TrueAuth</button>
        <div class="nav-links">
          <button class="nav-link" (click)="router.navigate(['/about'])">About</button>
          <button class="nav-link" (click)="router.navigate(['/privacy'])">Privacy</button>
          <button class="nav-link cta" (click)="router.navigate(['/login'])">Sign in</button>
          <button class="theme-btn" (click)="theme.toggle()" title="Toggle theme">
            {{ theme.theme() === 'dark' ? '☀️' : '🌙' }}
          </button>
        </div>
      </nav>

      <main class="about-main">
        <section class="about-hero">
          <div class="hero-badge">Our Mission</div>
          <h1 class="about-title">Email should <em>help</em> you,<br>not overwhelm you.</h1>
          <p class="about-subtitle">TrueAuth is an AI-native email manager built to help you reclaim your inbox. We combine cutting-edge LLMs with smart automation to keep your workflow clean, focused, and secure.</p>
        </section>

        <section class="features-grid">
          <div class="feature-card" *ngFor="let f of features">
            <div class="feature-icon">{{ f.icon }}</div>
            <h3 class="feature-title">{{ f.title }}</h3>
            <p class="feature-desc">{{ f.desc }}</p>
          </div>
        </section>

        <section class="mission-section">
          <div class="mission-card">
            <h2>Built on trust &amp; transparency</h2>
            <p>We believe your data belongs to <strong>you</strong>. TrueAuth only reads the emails you explicitly authorize. Your Google tokens are encrypted, never sold, and you can revoke access at any time from your Google account settings.</p>
            <div class="stat-row">
              <div class="stat"><span class="stat-num">0</span><span class="stat-label">Emails stored by us</span></div>
              <div class="stat"><span class="stat-num">100%</span><span class="stat-label">OAuth-based access</span></div>
              <div class="stat"><span class="stat-num">Open</span><span class="stat-label">Source architecture</span></div>
            </div>
          </div>
        </section>
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
    .nav-link.cta:hover { opacity: 0.9; }
    .theme-btn { background: var(--surface); border: 1px solid var(--border); border-radius: 0.5rem; cursor: pointer; padding: 0.4rem 0.6rem; font-size: 1rem; }
    .about-main { max-width: 1000px; margin: 0 auto; padding: 4rem 2rem; }
    .about-hero { text-align: center; margin-bottom: 4rem; }
    .hero-badge { display: inline-block; padding: 0.25rem 0.9rem; border-radius: 99px; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; background: var(--accent-subtle); color: var(--accent); margin-bottom: 1.5rem; }
    .about-title { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; line-height: 1.15; letter-spacing: -0.03em; margin-bottom: 1.25rem; }
    .about-title em { font-style: normal; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .about-subtitle { font-size: 1.1rem; color: var(--text-secondary); max-width: 560px; margin: 0 auto; line-height: 1.7; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 1.5rem; margin-bottom: 4rem; }
    .feature-card { background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; padding: 1.75rem; transition: transform 0.2s, box-shadow 0.2s; }
    .feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px var(--shadow); }
    .feature-icon { font-size: 2rem; margin-bottom: 1rem; }
    .feature-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; }
    .feature-desc { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; }
    .mission-section { }
    .mission-card { background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%); border-radius: 1.5rem; padding: 3rem; color: white; }
    .mission-card h2 { font-size: 1.75rem; font-weight: 800; margin-bottom: 1rem; }
    .mission-card p { opacity: 0.9; line-height: 1.7; margin-bottom: 2rem; }
    .stat-row { display: flex; gap: 2rem; flex-wrap: wrap; }
    .stat { display: flex; flex-direction: column; gap: 0.25rem; }
    .stat-num { font-size: 2rem; font-weight: 800; }
    .stat-label { font-size: 0.8rem; opacity: 0.8; }
    .site-footer { display: flex; align-items: center; justify-content: center; gap: 1.5rem; padding: 2rem; border-top: 1px solid var(--border); color: var(--text-secondary); font-size: 0.85rem; }
    .footer-link { background: none; border: none; cursor: pointer; color: var(--text-secondary); text-decoration: underline; font-size: 0.85rem; }
    .footer-link:hover { color: var(--accent); }
  `]
})
export class AboutComponent {
  router = inject(Router);
  theme = inject(ThemeService);

  features = [
    { icon: '🧠', title: 'AI-Powered Cleanup', desc: 'Gemini AI reads your inbox structure and identifies subscriptions, promotions, and OTP codes for one-click removal.' },
    { icon: '🔐', title: 'OAuth-Only Access', desc: 'We never store your password. All Gmail access is granted via Google\'s industry-standard OAuth 2.0 protocol.' },
    { icon: '⚡', title: 'Background Jobs', desc: 'Bull MQ queue ensures cleanup tasks run asynchronously, so your experience stays snappy even for large inboxes.' },
    { icon: '📅', title: 'Smart Calendar', desc: 'Detects meeting invites and time references in emails and suggests Google Calendar events automatically.' },
    { icon: '✍️', title: 'AI Draft Replies', desc: 'Tone-matched draft replies generated by Gemini directly inserted into your Gmail Drafts folder.' },
    { icon: '🛡️', title: 'Zero Data Retention', desc: 'Email content is processed in-memory and never written to our servers. Your privacy is non-negotiable.' },
  ];
}
