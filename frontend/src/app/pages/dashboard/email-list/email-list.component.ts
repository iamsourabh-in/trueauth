import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-email-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './email-list.component.html',
  styleUrl: './email-list.component.css'
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

  searchQuery = '';
  selectedCategories = new Set<string>();
  availableCategories: string[] = [];
  filterMenuOpen = false;
  searchTimeout: any;

  @HostListener('document:click')
  closeMenus() {
    this.activeMenuId = null;
    this.filterMenuOpen = false;
  }

  async ngOnInit() {
    await this.fetchCategories();
    await this.load();
  }

  async fetchCategories() {
    try {
      const res = await this.api.getEmailCategories();
      this.availableCategories = res.categories || [];
    } catch { }
  }

  toggleFilterMenu(event: Event) {
    event.stopPropagation();
    this.filterMenuOpen = !this.filterMenuOpen;
    this.activeMenuId = null;
  }

  toggleCategory(cat: string) {
    if (this.selectedCategories.has(cat)) {
      this.selectedCategories.delete(cat);
    } else {
      this.selectedCategories.add(cat);
    }
    this.load(1);
  }

  clearFilters() {
    this.selectedCategories.clear();
    this.load(1);
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery = value;
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.load(1);
    }, 400); // 400ms debounce
  }

  async load(page: number = 1) {
    if (page === 1) this.loading = true;
    try {
      const catsArray = Array.from(this.selectedCategories);
      const limit = page === 1 && (this.searchQuery || catsArray.length) ? 50 : 50; 
      // ALWAYS load batches of 50 regardless. We could change the first load limit if we wanted, but 50 is fine.
      const res = await this.api.getEmails(page, 50, this.searchQuery, catsArray);
      
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
