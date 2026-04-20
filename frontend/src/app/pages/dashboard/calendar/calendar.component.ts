import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DatePipe],
  template: `
    <div class="calendar-page anim-fade-in">
      <div class="page-header">
        <div class="header-main">
          <h2 class="page-title">Monthly Schedule</h2>
          <p class="page-sub">Intelligent view of your upcoming events and commitments.</p>
        </div>
        <div class="month-label">
          <lucide-icon name="calendar" [size]="20"></lucide-icon>
          <span>{{ now | date:'MMMM yyyy' }}</span>
        </div>
      </div>

      <div class="calendar-grid">
         <!-- Left Column: Upcoming Timeline -->
         <div class="timeline-column">
            <div class="section-card glass-card">
               <div class="card-header">
                  <h3 class="card-title">Next 24 Hours</h3>
                  <span class="badge">{{ eventsToday.length }} Events</span>
               </div>
               
               <div class="timeline-list">
                  <div class="timeline-item" *ngFor="let ev of eventsToday">
                     <div class="time-marker">
                        <span class="time">{{ ev.start?.dateTime | date:'HH:mm' }}</span>
                        <div class="dot" [class.now]="isCurrentlyRunning(ev)"></div>
                     </div>
                     <div class="event-content">
                        <span class="event-title">{{ ev.summary }}</span>
                        <span class="event-loc" *ngIf="ev.location">
                           <lucide-icon name="map-pin" [size]="12"></lucide-icon>
                           {{ ev.location }}
                        </span>
                     </div>
                  </div>
                  <div class="empty-timeline" *ngIf="eventsToday.length === 0">
                     <p>Clear schedule for today.</p>
                  </div>
               </div>
            </div>
         </div>

         <!-- Right Column: Full Month List -->
         <div class="main-column">
            <div class="month-container glass-card">
               <div class="card-header">
                  <h3 class="card-title">Coming up this month</h3>
               </div>

               <div class="events-list">
                  <div class="event-row" *ngFor="let ev of events; let i = index" [style.animation-delay]="i * 30 + 'ms'">
                     <div class="date-box">
                        <span class="day">{{ ev.start?.dateTime | date:'dd' }}</span>
                        <span class="month">{{ ev.start?.dateTime | date:'MMM' }}</span>
                     </div>
                     
                     <div class="event-info">
                        <div class="title-row">
                           <span class="title">{{ ev.summary }}</span>
                           <span class="time-range">
                              {{ ev.start?.dateTime | date:'h:mm a' }} - {{ ev.end?.dateTime | date:'h:mm a' }}
                           </span>
                        </div>
                        <div class="meta-row">
                           <span class="meta-tag" *ngIf="ev.creator?.email">
                              <lucide-icon name="user" [size]="12"></lucide-icon>
                              {{ ev.creator.email }}
                           </span>
                           <span class="meta-tag" *ngIf="ev.location">
                              <lucide-icon name="map-pin" [size]="12"></lucide-icon>
                              {{ ev.location }}
                           </span>
                        </div>
                     </div>

                     <div class="event-link">
                        <a [href]="ev.htmlLink" target="_blank" title="View in Google Calendar">
                           <lucide-icon name="external-link" [size]="16"></lucide-icon>
                        </a>
                     </div>
                  </div>

                  <div class="loading-state" *ngIf="loading">
                     <div class="spinner"></div>
                     <p>Fetching your schedule...</p>
                  </div>

                  <div class="empty-month" *ngIf="!loading && events.length === 0">
                     <lucide-icon name="calendar-off" [size]="48" style="opacity: 0.1"></lucide-icon>
                     <h3>Quiet month ahead</h3>
                     <p>No events scheduled for the rest of this month.</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  `,
  styles: [`
    .calendar-page { display: flex; flex-direction: column; gap: 2rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; }
    .page-title { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem; }
    .page-sub { font-size: 0.9rem; color: var(--text-secondary); }

    .month-label { 
      display: flex; align-items: center; gap: 0.75rem; 
      padding: 0.75rem 1.25rem; background: var(--accent); color: white;
      border-radius: 1rem; font-weight: 700; box-shadow: var(--shadow-small);
    }

    .calendar-grid { display: grid; grid-template-columns: 320px 1fr; gap: 2rem; align-items: start; }

    .section-card { border-radius: 1.25rem; overflow: hidden; height: 100%; border: 1px solid var(--border); }
    .card-header { 
      padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center;
      background: var(--surface2);
    }
    .card-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); }
    .badge { font-size: 0.65rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 2rem; background: var(--accent-subtle); color: var(--accent); }

    /* Timeline */
    .timeline-list { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
    .timeline-item { display: flex; gap: 1rem; position: relative; }
    .time-marker { display: flex; flex-direction: column; align-items: center; min-width: 45px; }
    .time { font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border); margin-top: 0.4rem; z-index: 2; border: 2px solid var(--surface); }
    .dot.now { background: #ef4444; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15); }
    
    .timeline-item::after { 
      content: ''; position: absolute; left: 51px; top: 20px; bottom: -30px; 
      width: 2px; background: var(--border); z-index: 1;
    }
    .timeline-item:last-child::after { display: none; }

    .event-content { display: flex; flex-direction: column; gap: 0.2rem; }
    .event-title { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
    .event-loc { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.25rem; }

    /* Main Month List */
    .month-container { height: 100%; border: 1px solid var(--border); border-radius: 1.25rem; display: flex; flex-direction: column; }
    .events-list { flex: 1; overflow-y: auto; }
    .event-row { 
      display: flex; align-items: center; padding: 1.25rem 1.5rem; 
      border-bottom: 1px solid var(--border); gap: 1.5rem; 
      transition: all 0.2s; animation: slideIn 0.3s ease-both;
    }
    .event-row:hover { background: var(--surface2); }
    .event-row:last-child { border-bottom: none; }

    .date-box { 
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-width: 54px; height: 54px; border-radius: 1rem; 
      background: var(--surface2); border: 1px solid var(--border);
    }
    .date-box .day { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .date-box .month { font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }

    .event-info { flex: 1; display: flex; flex-direction: column; gap: 0.4rem; }
    .title-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
    .time-range { font-size: 0.8rem; font-weight: 600; color: var(--accent); }

    .meta-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .meta-tag { 
       display: flex; align-items: center; gap: 0.35rem; 
       font-size: 0.75rem; color: var(--text-secondary); background: var(--surface2);
       padding: 0.2rem 0.6rem; border-radius: 0.5rem;
    }

    .event-link a { 
      color: var(--text-muted); transition: color 0.2s; display: flex; padding: 0.5rem; border-radius: 0.5rem;
    }
    .event-link a:hover { color: var(--accent); background: var(--accent-subtle); }

    .loading-state { padding: 4rem; text-align: center; color: var(--text-muted); }
    .spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }

    .empty-month { padding: 5rem 2rem; text-align: center; color: var(--text-muted); }
    .empty-month h3 { margin: 1rem 0 0.5rem; color: var(--text-primary); }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes slideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }

    @media (max-width: 1024px) {
      .calendar-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class CalendarPageComponent implements OnInit {
  api = inject(ApiService);
  now = new Date();
  events: any[] = [];
  eventsToday: any[] = [];
  loading = true;

  async ngOnInit() {
    try {
      this.events = await this.api.getCalendarEvents();
      this.filterToday();
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      this.loading = false;
    }
  }

  filterToday() {
    const todayStr = this.now.toISOString().split('T')[0];
    this.eventsToday = this.events.filter(ev => {
       const start = ev.start?.dateTime || ev.start?.date;
       return start?.startsWith(todayStr);
    });
  }

  isCurrentlyRunning(ev: any): boolean {
    const start = new Date(ev.start?.dateTime).getTime();
    const end = new Date(ev.end?.dateTime).getTime();
    const nowTime = this.now.getTime();
    return nowTime >= start && nowTime <= end;
  }
}
