import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);
  const session = await supabase.getSession();
  if (!session) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};

export const loginGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);
  const session = await supabase.getSession();
  if (session) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};
