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
  templateUrl: './draft.component.html',
  styleUrl: './draft.component.css'
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
