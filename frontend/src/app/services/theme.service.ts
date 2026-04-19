import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'ta-theme';
  private platformId = inject(PLATFORM_ID);

  theme = signal<Theme>(this.loadTheme());

  constructor() {
    // Apply theme to <html> element whenever it changes (browser only)
    effect(() => {
      const t = this.theme();
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.classList.toggle('dark', t === 'dark');
        try { localStorage.setItem(this.STORAGE_KEY, t); } catch { /* ssr safe */ }
      }
    });
  }

  toggle() {
    this.theme.update(t => (t === 'dark' ? 'light' : 'dark'));
  }

  private loadTheme(): Theme {
    if (!isPlatformBrowser(this.platformId)) return 'light';
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
      if (stored === 'dark' || stored === 'light') return stored;
    } catch { /* ssr */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
