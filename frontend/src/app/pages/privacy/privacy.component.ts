import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.css'
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
