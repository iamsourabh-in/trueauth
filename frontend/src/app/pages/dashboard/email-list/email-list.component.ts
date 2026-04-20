import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-email-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="email-page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Inbox</h2>
          <p class="page-sub">Ingested emails for AI analysis and organization.</p>
        </div>
        <button class="btn-primary" (click)="sync()" [disabled]="syncing">
          <lucide-icon name="refresh-cw" [size]="15" [class.spin]="syncing"></lucide-icon>
          {{ syncing ? 'Syncing...' : 'Sync Now' }}
        </button>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading && !emails.length">
        <div class="skeleton-row" *ngFor="let i of [1,2,3,4,5,6]"></div>
      </div>

      <!-- Email List -->
      <div class="email-list" *ngIf="!loading || emails.length > 0">
        <div 
          class="email-item" 
          *ngFor="let email of emails; let i = index" 
          [style.animation-delay]="(i % 50) * 20 + 'ms'"
          [class.menu-open]="activeMenuId === email.message_id"
          [style.z-index]="activeMenuId === email.message_id ? 1000 : 1"
        >
          <div class="email-avatar">{{ email.sender.charAt(0).toUpperCase() }}</div>
          <div class="email-main" (click)="viewEmail(email.message_id)">
            <div class="email-top">
              <span class="email-sender" [title]="email.sender">{{ email.sender }}</span>
              <span class="email-date">{{ email.received_at | date:'MMM d' }}</span>
            </div>
            <div class="email-subject">{{ email.subject }}</div>
            <div class="email-snippet">{{ email.snippet }}</div>
            
            <div class="email-metadata" *ngIf="email.category || email.ai_metadata?.tags">
              <span class="badge category" *ngIf="email.category">{{ email.category }}</span>
              <span class="badge tag" *ngFor="let tag of email.ai_metadata?.tags">{{ tag }}</span>
            </div>
          </div>
          
          <div class="email-actions">
             <button class="more-btn" (click)="toggleMenu($event, email.message_id)" title="Options">
                <lucide-icon name="more-vertical" [size]="18"></lucide-icon>
             </button>

              <!-- Dropdown Menu -->
              <div class="dropdown-menu" *ngIf="activeMenuId === email.message_id" (click)="$event.stopPropagation()">
                 <button class="menu-item" (click)="analyzeEmail(email.message_id)">
                   <lucide-icon name="sparkles" [size]="14"></lucide-icon>
                   <span>Analyze with AI</span>
                 </button>
                 <button class="menu-item" (click)="goToDraft(email.thread_id)">
                   <lucide-icon name="pen-box" [size]="14"></lucide-icon>
                   <span>AI Draft Reply</span>
                 </button>
                 <button class="menu-item danger" (click)="deleteEmail(email.message_id)">
                   <lucide-icon name="trash-2" [size]="14"></lucide-icon>
                   <span>Delete Email</span>
                 </button>
              </div>
           </div>
         </div>
 

         <!-- Load More -->
        <div class="pagination-area" *ngIf="hasMore && !loading">
            <button class="btn-secondary" (click)="loadMore()">
                <span>Load More</span>
            </button>
        </div>

        <div class="empty-state" *ngIf="!loading && emails.length === 0">
          <lucide-icon name="mail" [size]="40" style="opacity: 0.2"></lucide-icon>
          <h3>No emails synced</h3>
          <p>Click "Sync Now" to ingest your recent emails from Gmail.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .email-page { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .page-title { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem; }
    .page-sub { font-size: 0.875rem; color: var(--text-secondary); }
    
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--accent); color: white; border: none; border-radius: 0.625rem; cursor: pointer; font-size: 0.875rem; font-weight: 600; padding: 0.65rem 1.25rem; transition: all 0.2s; }
    .btn-secondary { display: flex; align-items: center; justify-content: center; width: 100%; padding: 0.8rem; background: var(--surface); border: 1px dashed var(--border); border-radius: 0.75rem; color: var(--text-secondary); font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-secondary:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-subtle); }

    .pagination-area { padding: 1rem 0; }

    .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
    
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .skeleton-row { height: 80px; background: var(--surface2); border-radius: 0.75rem; margin-bottom: 0.75rem; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

    .email-list { display: flex; flex-direction: column; gap: 0.75rem; overflow: visible; }
    .email-item { display: flex; gap: 1rem; padding: 1.1rem; background: var(--surface); border: 1px solid var(--border); border-radius: 0.875rem; cursor: pointer; transition: all 0.2s; animation: slideUp 0.3s ease both; overflow: visible; align-items: center; position: relative; }
    .email-item:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: var(--card-shadow); }
    .email-item.menu-open { border-color: var(--accent); box-shadow: var(--card-shadow); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .email-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--accent-subtle); color: var(--accent); display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
    .email-main { flex: 1; min-width: 0; }
    .email-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; }
    .email-sender { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
    .email-date { font-size: 0.75rem; color: var(--text-secondary); }
    .email-subject { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .email-snippet { font-size: 0.85rem; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }

    .email-actions { flex-shrink: 0; position: relative; }
    
    /* Fixed visibility: removed opacity: 0 */
    .more-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 0.5rem; border: 1px solid var(--border); background: var(--surface2); color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
    .email-item:hover .more-btn { color: var(--accent); border-color: var(--accent); }
    .email-item.menu-open .more-btn { background: var(--accent); color: white; border-color: var(--accent); }

    .dropdown-menu { 
      position: absolute; top: 40px; right: 0; 
      background: var(--surface); border: 1px solid var(--border); 
      border-radius: 0.75rem; z-index: 10000 !important; min-width: 170px; padding: 0.4rem;
      display: flex; flex-direction: column; gap: 2px;
      animation: fadeIn 0.1s ease-out;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.2);
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
    
    .menu-item { 
      display: flex; align-items: center; gap: 0.6rem; 
      padding: 0.6rem 0.8rem; border-radius: 0.5rem; 
      border: none; background: none; color: var(--text-primary); 
      font-size: 0.85rem; font-weight: 500; cursor: pointer; 
      transition: all 0.15s; width: 100%; text-align: left;
    }
    .menu-item:hover { background: var(--surface2); }
    .menu-item.danger { color: var(--danger); }
    .menu-item.danger:hover { background: rgba(239,68,68,0.08); }

    .email-metadata { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.6rem; }
    .badge {
      font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.5rem;
      border-radius: 2rem; text-transform: capitalize;
    }
    .badge.category { background: var(--accent); color: white; }
    .badge.tag { background: var(--surface2); color: var(--text-secondary); border: 1px solid var(--border); }

    .empty-state { padding: 4rem 2rem; text-align: center; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }

    @media (max-width: 640px) {
      .email-item { padding: 0.75rem; gap: 0.6rem; }
      .email-avatar { width: 32px; height: 32px; font-size: 0.7rem; }
      .email-sender { max-width: 130px; font-size: 0.8rem; }
      .email-date { font-size: 0.65rem; }
      .email-subject { font-size: 0.85rem; }
      .email-snippet { font-size: 0.75rem; }
      .badge { font-size: 0.6rem; padding: 0.1rem 0.4rem; }
    }
  `]
})
export class EmailListComponent implements OnInit {
  api = inject(ApiService);
  router = inject(Router);
  loading = true;
  syncing = false;
  emails: any[] = [];
  activeMenuId: string | null = null;
  
  currentPage = 1;
  hasMore = false;

  @HostListener('document:click')
  closeMenus() {
    this.activeMenuId = null;
  }

  async ngOnInit() {
    await this.load();
  }

  async load(page: number = 1) {
    if (page === 1) this.loading = true;
    try {
      const res = await this.api.getEmails(page);
      if (page === 1) {
        this.emails = res.emails || [];
      } else {
        this.emails = [...this.emails, ...(res.emails || [])];
      }
      this.hasMore = res.hasMore;
      this.currentPage = page;
    } catch { }
    finally { this.loading = false; }
  }

  async loadMore() {
    await this.load(this.currentPage + 1);
  }

  async sync() {
    this.syncing = true;
    try {
      await this.api.syncMailbox();
      await this.load(1);
    } catch { }
    finally { this.syncing = false; }
  }

  toggleMenu(event: Event, id: string) {
    event.stopPropagation();
    this.activeMenuId = this.activeMenuId === id ? null : id;
  }

  goToDraft(threadId: string) {
    this.activeMenuId = null;
    this.router.navigate(['/dashboard/draft'], { queryParams: { threadId } });
  }

  async deleteEmail(id: string) {
    const index = this.emails.findIndex(e => e.message_id === id);
    if (index > -1) {
        const removed = this.emails.splice(index, 1)[0];
        try {
            await this.api.deleteMessage(id);
        } catch (e) {
            this.emails.splice(index, 0, removed);
        }
    }
  }

  viewEmail(id: string) {
    this.router.navigate(['/dashboard/inbox', id]);
  }

  async analyzeEmail(id: string) {
    this.activeMenuId = null;
    const email = this.emails.find(e => e.message_id === id);
    if (!email) return;

    try {
        const res = await this.api.analyzeMessage(id);
        if (res.success) {
            email.category = res.analysis.category;
            email.ai_metadata = res.analysis;
        }
    } catch (e) {
        console.error('Analysis failed', e);
    }
  }
}
