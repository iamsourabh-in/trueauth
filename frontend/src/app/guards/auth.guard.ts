import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  // Give Supabase a moment to hydrate the session from the URL hash after OAuth
  let session = await supabase.getSession();
  if (!session) {
    // Retry once after a short wait (handles the post-OAuth redirect case)
    await new Promise(r => setTimeout(r, 500));
    session = await supabase.getSession();
  }
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
    router.navigate(['/dashboard/summary']);
    return false;
  }
  return true;
};
