import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

interface Suggestion { title?: string; start?: string; end?: string; }

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="cal-page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Smart Calendar</h2>
          <p class="page-sub">Paste email content and let AI extract meeting details to add to Google Calendar.</p>
        </div>
      </div>

      <div class="cal-layout">
        <div class="input-card">
          <label class="field-label" for="email-content">Email snippet</label>
          <textarea
            id="email-content"
            class="field-textarea"
            [(ngModel)]="emailContent"
            placeholder="Paste an email here, e.g. 'Let's meet Tuesday at 3pm for a 1 hour catch-up…'"
            rows="6"
          ></textarea>
          <button class="btn-primary" (click)="suggest()" [disabled]="loading || !emailContent.trim()">
            <lucide-icon name="sparkles" [size]="15" color="white"></lucide-icon>
            {{ loading ? 'Extracting…' : 'Extract event details' }}
          </button>
        </div>

        <!-- Suggestion card -->
        <div class="suggestion-card" *ngIf="suggestion || error">
          <div *ngIf="suggestion">
            <h3 class="sug-title">Event detected</h3>
            <div class="event-preview">
              <div class="event-field">
                <span class="event-field-label">Title</span>
                <input class="field-input" [(ngModel)]="suggestion!.title" />
              </div>
              <div class="event-field">
                <span class="event-field-label">Start</span>
                <input class="field-input" [(ngModel)]="suggestion!.start" placeholder="YYYY-MM-DDTHH:MM" />
              </div>
              <div class="event-field">
                <span class="event-field-label">End</span>
                <input class="field-input" [(ngModel)]="suggestion!.end" placeholder="YYYY-MM-DDTHH:MM" />
              </div>
              <button class="btn-success" (click)="create()" [disabled]="creating">
                <lucide-icon name="check" [size]="15" color="white"></lucide-icon>
                {{ creating ? 'Adding…' : 'Add to Google Calendar' }}
              </button>
              <a *ngIf="eventUrl" [href]="eventUrl" target="_blank" class="event-link">
                Open event in Google Calendar →
              </a>
            </div>
          </div>
          <p class="error-msg" *ngIf="error">{{ error }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cal-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-title { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem; }
    .page-sub { font-size: 0.875rem; color: var(--text-secondary); }
    .cal-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    @media (max-width: 700px) { .cal-layout { grid-template-columns: 1fr; } }
    .input-card, .suggestion-card { background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .field-label { font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); }
    .field-textarea { width: 100%; padding: 0.75rem; background: var(--surface2); border: 1px solid var(--border); border-radius: 0.625rem; color: var(--text-primary); font-size: 0.875rem; resize: vertical; outline: none; font-family: inherit; transition: border-color 0.2s; }
    .field-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-subtle); }
    .field-input { width: 100%; padding: 0.55rem 0.75rem; background: var(--surface2); border: 1px solid var(--border); border-radius: 0.5rem; color: var(--text-primary); font-size: 0.875rem; outline: none; transition: border-color 0.2s; }
    .field-input:focus { border-color: var(--accent); }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--accent); color: white; border: none; border-radius: 0.625rem; cursor: pointer; font-size: 0.875rem; font-weight: 600; padding: 0.7rem 1.25rem; transition: all 0.2s; align-self: flex-start; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; pointer-events: none; }
    .sug-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.75rem; }
    .event-preview { display: flex; flex-direction: column; gap: 0.75rem; }
    .event-field { display: flex; flex-direction: column; gap: 0.3rem; }
    .event-field-label { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }
    .btn-success { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--success); color: white; border: none; border-radius: 0.625rem; cursor: pointer; font-size: 0.875rem; font-weight: 600; padding: 0.65rem 1.1rem; transition: all 0.2s; align-self: flex-start; margin-top: 0.25rem; }
    .btn-success:disabled { opacity: 0.5; pointer-events: none; }
    .event-link { font-size: 0.85rem; color: var(--accent); text-decoration: none; }
    .event-link:hover { text-decoration: underline; }
    .error-msg { font-size: 0.875rem; color: var(--danger); }
  `]
})
export class CalendarPageComponent {
  api = inject(ApiService);
  emailContent = '';
  loading = false;
  creating = false;
  suggestion: Suggestion | null = null;
  error = '';
  eventUrl = '';

  async suggest() {
    this.loading = true;
    this.suggestion = null;
    this.error = '';
    try {
      const res = await this.api.suggestCalendarEvent(this.emailContent.trim());
      this.suggestion = res;
    } catch (e: any) {
      this.error = e?.error?.details ?? e?.message ?? 'Failed to extract calendar details.';
    } finally {
      this.loading = false;
    }
  }

  async create() {
    if (!this.suggestion) return;
    this.creating = true;
    this.eventUrl = '';
    try {
      const res = await this.api.createCalendarEvent(this.suggestion);
      this.eventUrl = res.eventUrl ?? '';
    } catch (e: any) {
      this.error = e?.error?.details ?? e?.message ?? 'Failed to create calendar event.';
    } finally {
      this.creating = false;
    }
  }
}
