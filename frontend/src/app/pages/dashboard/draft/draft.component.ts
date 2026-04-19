import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-draft-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="draft-page">
      <div class="page-header">
        <div>
          <h2 class="page-title">AI Draft Reply</h2>
          <p class="page-sub">Let Gemini AI write a tone-matched reply from a Gmail thread ID.</p>
        </div>
      </div>

      <div class="draft-layout">
        <!-- Input card -->
        <div class="input-card">
          <label class="field-label" for="thread-input">Gmail Thread ID</label>
          <input
            id="thread-input"
            class="field-input"
            [(ngModel)]="threadId"
            placeholder="e.g. 18d4b9c0f1e2a3b4"
            autocomplete="off"
          />
          <p class="field-hint">Find it in Gmail URL: mail.google.com/…#inbox/<strong>thread-id</strong></p>
          <button class="btn-primary" (click)="generate()" [disabled]="loading || !threadId.trim()">
            <lucide-icon name="pen-box" [size]="15" color="white"></lucide-icon>
            {{ loading ? 'Generating…' : 'Generate draft' }}
          </button>
        </div>

        <!-- Result card -->
        <div class="result-card" *ngIf="result || error">
          <div class="result-header">
            <h3 *ngIf="result">Draft created ✓</h3>
            <h3 class="err-title" *ngIf="error">Error</h3>
          </div>
          <div class="success-body" *ngIf="result">
            <p class="success-msg">Your AI draft has been saved directly to your Gmail Drafts folder.</p>
            <div class="draft-id-pill">
              <lucide-icon name="check" [size]="12"></lucide-icon>
              Draft ID: <code>{{ result }}</code>
            </div>
          </div>
          <p class="error-msg" *ngIf="error">{{ error }}</p>
        </div>
      </div>

      <!-- How it works -->
      <div class="how-card">
        <h3 class="how-title">How it works</h3>
        <div class="steps">
          <div class="step" *ngFor="let s of steps; let i = index">
            <div class="step-num">{{ i + 1 }}</div>
            <div>
              <strong>{{ s.title }}</strong>
              <p>{{ s.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .draft-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { }
    .page-title { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem; }
    .page-sub { font-size: 0.875rem; color: var(--text-secondary); }
    .draft-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    @media (max-width: 700px) { .draft-layout { grid-template-columns: 1fr; } }
    .input-card, .result-card { background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .field-label { font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); }
    .field-input { width: 100%; padding: 0.7rem 0.9rem; background: var(--surface2); border: 1px solid var(--border); border-radius: 0.625rem; color: var(--text-primary); font-size: 0.9rem; outline: none; transition: border-color 0.2s; font-family: monospace; }
    .field-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-subtle); }
    .field-hint { font-size: 0.75rem; color: var(--text-muted); }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--accent); color: white; border: none; border-radius: 0.625rem; cursor: pointer; font-size: 0.875rem; font-weight: 600; padding: 0.7rem 1.25rem; transition: all 0.2s; align-self: flex-start; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; pointer-events: none; }
    .result-header h3 { font-size: 1rem; font-weight: 700; color: var(--success); }
    .err-title { color: var(--danger) !important; }
    .success-msg { font-size: 0.875rem; color: var(--text-secondary); }
    .draft-id-pill { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem; background: rgba(34,197,94,0.1); color: var(--success); border-radius: 0.5rem; font-size: 0.8rem; border: 1px solid rgba(34,197,94,0.2); }
    .draft-id-pill code { font-family: monospace; }
    .error-msg { font-size: 0.875rem; color: var(--danger); }
    .how-card { background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; padding: 1.5rem; }
    .how-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem; }
    .steps { display: flex; flex-direction: column; gap: 1rem; }
    .step { display: flex; gap: 1rem; align-items: flex-start; }
    .step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--accent-subtle); color: var(--accent); font-weight: 700; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .step strong { display: block; font-size: 0.875rem; color: var(--text-primary); margin-bottom: 0.15rem; }
    .step p { font-size: 0.8rem; color: var(--text-secondary); }
  `]
})
export class DraftPageComponent implements OnInit {
  api = inject(ApiService);
  route = inject(ActivatedRoute);
  threadId = '';
  loading = false;
  result = '';
  error = '';

  steps = [
    { title: 'Paste your thread ID', desc: 'Find it in the Gmail URL or use the message details panel.' },
    { title: 'Gemini reads the thread', desc: 'The last 10 messages are retrieved and analyzed for context and tone.' },
    { title: 'Draft saved to Gmail', desc: 'A reply is generated and saved straight to your Gmail Drafts — ready to review and send.' },
  ];

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['threadId']) {
        this.threadId = params['threadId'];
      }
    });
  }

  async generate() {
    this.loading = true;
    this.result = '';
    this.error = '';
    try {
      const res = await this.api.generateDraft(this.threadId.trim());
      this.result = res.draftId ?? 'created';
    } catch (e: any) {
      this.error = e?.error?.details ?? e?.message ?? 'Draft generation failed.';
    } finally {
      this.loading = false;
    }
  }
}
