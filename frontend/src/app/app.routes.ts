import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardLayoutComponent } from './pages/dashboard/dashboard-layout.component';
import { InboxComponent } from './pages/dashboard/inbox/inbox.component';
import { EmailListComponent } from './pages/dashboard/email-list/email-list.component';
import { SubscriptionsPageComponent } from './pages/dashboard/subscriptions/subscriptions.component';
import { CleanupPageComponent } from './pages/dashboard/cleanup/cleanup.component';
import { DraftPageComponent } from './pages/dashboard/draft/draft.component';
import { CalendarPageComponent } from './pages/dashboard/calendar/calendar.component';
import { AboutComponent } from './pages/about/about.component';
import { PrivacyComponent } from './pages/privacy/privacy.component';
import { authGuard, loginGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'summary', pathMatch: 'full' },
      { path: 'summary',       component: InboxComponent },
      { path: 'inbox',         component: EmailListComponent },
      { path: 'subscriptions', component: SubscriptionsPageComponent },
      { path: 'cleanup',       component: CleanupPageComponent },
      { path: 'draft',         component: DraftPageComponent },
      { path: 'calendar',      component: CalendarPageComponent },
    ]
  },
  { path: 'about',   component: AboutComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: '**', redirectTo: '/login' }
];
