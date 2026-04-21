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
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
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
