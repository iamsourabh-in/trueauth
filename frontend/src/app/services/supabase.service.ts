import { Injectable } from '@angular/core';
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUser = new BehaviorSubject<User | null>(null);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentUser.next(session?.user ?? null);
    });

    this.supabase.auth.onAuthStateChange((_event: string, session: any) => {
      this.currentUser.next(session?.user ?? null);
    });
  }

  get user(): Observable<User | null> {
    return this.currentUser.asObservable();
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session ?? null;
  }

  get sessionToken(): Promise<string | null> {
    return this.supabase.auth.getSession().then(({ data }) => data.session?.access_token ?? null);
  }

  async signInWithGoogle() {
    const redirectTo = `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard`;
    await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes:
          'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email'
      }
    });
  }

  async signOut() {
    await this.supabase.auth.signOut();
  }
}
