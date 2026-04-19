import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center px-4 bg-[#f0f2f5]">
      <div class="w-full max-w-[400px] bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.12)] border border-[#dadce0] px-10 py-12">
        <div class="flex flex-col items-center text-center mb-8">
          <div
            class="w-10 h-10 rounded-full bg-[#1a73e8] flex items-center justify-center mb-4 text-white font-medium text-lg"
            aria-hidden="true"
          >
            T
          </div>
          <h1 class="text-[22px] font-normal text-[#202124] leading-tight mb-1">TrueAuth</h1>
          <p class="text-sm text-[#5f6368] leading-snug">Sign in to manage your inbox with AI-assisted cleanup.</p>
        </div>

        <button
          type="button"
          (click)="login()"
          [disabled]="busy"
          class="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded border border-[#dadce0] bg-white text-[#3c4043] text-sm font-medium shadow-sm hover:bg-[#f8f9fa] hover:shadow focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none transition-shadow"
        >
          <svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{{ busy ? 'Redirecting…' : 'Sign in with Google' }}</span>
        </button>

        <p class="mt-8 text-center text-xs text-[#5f6368] leading-relaxed">
          By continuing, you agree to the Terms of Service and Privacy Policy.
        </p>
      </div>

      <p class="mt-6 text-xs text-[#5f6368]">Add <code class="text-[#1a73e8]">{{ origin }}/dashboard</code> to Supabase Auth → URL Configuration → Redirect URLs.</p>
    </div>
  `
})
export class LoginComponent implements OnDestroy {
  supabase = inject(SupabaseService);
  private router = inject(Router);
  private sub?: Subscription;

  busy = false;
  origin = typeof window !== 'undefined' ? window.location.origin : '';

  constructor() {
    this.sub = this.supabase.user.subscribe((user) => {
      if (user) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  async login() {
    this.busy = true;
    try {
      await this.supabase.signInWithGoogle();
    } catch {
      this.busy = false;
    }
  }
}
