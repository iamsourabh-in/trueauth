import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'ta-theme';

  theme = signal<Theme>(this.loadTheme());

  constructor() {
    // Apply theme to <html> element whenever it changes
    effect(() => {
      const t = this.theme();
      document.documentElement.classList.toggle('dark', t === 'dark');
      try { localStorage.setItem(this.STORAGE_KEY, t); } catch { /* ssr safe */ }
    });
  }

  toggle() {
    this.theme.update(t => (t === 'dark' ? 'light' : 'dark'));
  }

  private loadTheme(): Theme {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
      if (stored === 'dark' || stored === 'light') return stored;
    } catch { /* ssr */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
