import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DatePipe, FormsModule],
  template: `
    <div class="calendar-page anim-fade-in">
      <div class="page-header">
        <div class="header-main">
          <h2 class="page-title">Monthly Schedule</h2>
          <p class="page-sub">Intelligent view of your upcoming events and commitments.</p>
        </div>
        <div class="header-actions">
           <label class="toggle-checkbox">
             <input type="checkbox" [(ngModel)]="showHolidays" (change)="generateGrid()">
             <span>Show public holidays</span>
           </label>
           
           <div class="month-controls">
             <button class="icon-btn hollow" (click)="prevMonth()">
               <lucide-icon name="chevron-left" [size]="18"></lucide-icon>
             </button>
             <div class="month-label">
               <lucide-icon name="calendar" [size]="20"></lucide-icon>
               <span>{{ currentMonthDate | date:'MMMM yyyy' }}</span>
             </div>
             <button class="icon-btn hollow" (click)="nextMonth()">
               <lucide-icon name="chevron-right" [size]="18"></lucide-icon>
             </button>
           </div>
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

         <!-- Right Column: Full Month Grid -->
         <div class="main-column">
            <div class="month-container glass-card">
               
               <div class="calendar-table-header">
                  <span class="weekday" *ngFor="let day of weekDays">{{ day }}</span>
               </div>
               
               <div class="calendar-table-body">
                  <div class="day-cell" *ngFor="let cell of calendarGrid" [class.empty]="!cell.date" [class.today]="cell.isToday" [class.weekend]="cell.isWeekend">
                     <div class="date-num" *ngIf="cell.date">{{ cell.dayNum }}</div>
                     
                     <div class="cell-events" *ngIf="cell.events.length > 0">
                        <ng-container *ngFor="let ev of cell.events">
                           <div class="cell-event-pill" *ngIf="shouldShowEvent(ev)" [title]="ev.summary">
                              <span class="evt-time" *ngIf="ev.start?.dateTime">{{ ev.start.dateTime | date:'HH:mm' }}</span>
                              <span class="evt-title">{{ ev.summary }}</span>
                           </div>
                        </ng-container>
                     </div>
                  </div>
               </div>

               <div class="loading-state" *ngIf="loading">
                  <div class="spinner"></div>
                  <p>Fetching your schedule...</p>
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

    .header-actions { display: flex; align-items: center; gap: 1.5rem; }
    
    .toggle-checkbox { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; }
    
    .month-controls { display: flex; align-items: center; gap: 0.5rem; }
    .month-label { 
      display: flex; align-items: center; gap: 0.5rem; min-width: 170px; justify-content: center;
      padding: 0.75rem 1rem; background: var(--accent); color: white;
      border-radius: 0.75rem; font-weight: 700; box-shadow: var(--shadow-small); font-size: 0.9rem;
    }
    
    .icon-btn.hollow { background: var(--surface2); border: 1px solid var(--border); padding: 0.6rem; border-radius: 0.75rem; color: var(--text-secondary); cursor: pointer; transition: all 0.2s;}
    .icon-btn.hollow:hover { background: var(--accent-subtle); color: var(--accent); border-color: var(--accent); }

    .calendar-grid { display: grid; grid-template-columns: 280px 1fr; gap: 2rem; align-items: start; }

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

    /* Grid Design */
    .month-container { 
      border: 1px solid var(--border); border-radius: 1.25rem; background: var(--surface);
      display: flex; flex-direction: column; overflow: hidden;
    }
    
    .calendar-table-header { display: grid; grid-template-columns: repeat(7, 1fr); background: var(--surface2); border-bottom: 1px solid var(--border); }
    .weekday { text-align: center; padding: 1rem 0; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; }

    .calendar-table-body { display: grid; grid-template-columns: repeat(7, 1fr); border-left: 1px solid var(--border); }
    .day-cell { 
       min-height: 120px; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border);
       padding: 0.5rem; position: relative; transition: background 0.1s;
       display: flex; flex-direction: column; gap: 0.25rem;
    }
    .day-cell:hover:not(.empty) { background: var(--surface2); }
    .day-cell.empty { background: rgba(0,0,0,0.01); pointer-events: none; }
    .day-cell.weekend { background: rgba(0,0,0,0.015); }
    .day-cell.today { background: var(--accent-subtle); }
    .day-cell.today .date-num { background: var(--accent); color: white; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }

    .date-num { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); align-self: flex-end; margin-bottom: 0.25rem; }
    
    .cell-events { display: flex; flex-direction: column; gap: 0.2rem; overflow-y: auto; max-height: 80px; }
    .cell-events::-webkit-scrollbar { width: 3px; }
    
    .cell-event-pill { 
       background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); 
       padding: 0.2rem 0.4rem; border-radius: 0.35rem; display: flex; gap: 0.3rem; align-items: center;
       cursor: pointer;
    }
    .cell-event-pill:hover { background: rgba(99, 102, 241, 0.2); border-color: rgba(99, 102, 241, 0.3); }
    .evt-time { font-size: 0.65rem; font-weight: 700; color: #4f46e5; flex-shrink: 0; }
    .evt-title { font-size: 0.7rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .loading-state { padding: 4rem; text-align: center; color: var(--text-muted); }
    .spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }

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
  currentMonthDate = new Date();
  
  events: any[] = [];
  eventsToday: any[] = [];
  loading = true;

  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  calendarGrid: any[] = [];
  showHolidays = true;

  async ngOnInit() {
    try {
      this.events = await this.api.getCalendarEvents();
      this.filterToday();
      this.generateGrid();
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      this.loading = false;
    }
  }

  generateGrid() {
    const year = this.currentMonthDate.getFullYear();
    const month = this.currentMonthDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    this.calendarGrid = [];
    
    // Pad
    for (let i = 0; i < firstDay; i++) {
       this.calendarGrid.push({ date: null, events: [] });
    }
    
    const todayStr = this.now.toDateString();
    
    for (let i = 1; i <= daysInMonth; i++) {
       const d = new Date(year, month, i);
       const dStr = d.toDateString();
       const dayOfWeek = d.getDay();
       
       // Correct local timezone ISO extraction matching Google's date strings
       const tzOffset = d.getTimezoneOffset() * 60000;
       const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
       
       const dayEvents = this.events.filter(ev => {
          const start = ev.start?.dateTime || ev.start?.date;
          return start?.startsWith(localISOTime);
       });
       
       this.calendarGrid.push({
          date: d,
          dayNum: i,
          events: dayEvents,
          isToday: dStr === todayStr,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6
       });
    }
  }

  prevMonth() {
    this.currentMonthDate.setMonth(this.currentMonthDate.getMonth() - 1);
    this.generateGrid();
  }

  nextMonth() {
    this.currentMonthDate.setMonth(this.currentMonthDate.getMonth() + 1);
    this.generateGrid();
  }

  shouldShowEvent(ev: any): boolean {
    if (!this.showHolidays && (ev.summary?.toLowerCase().includes('holiday') || ev.eventType === 'holiday')) {
       return false;
    }
    return true;
  }

  filterToday() {
    const tzOffset = this.now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(this.now.getTime() - tzOffset)).toISOString().split('T')[0];
    
    this.eventsToday = this.events.filter(ev => {
       const start = ev.start?.dateTime || ev.start?.date;
       return start?.startsWith(localISOTime);
    });
  }

  isCurrentlyRunning(ev: any): boolean {
    if (!ev.start?.dateTime || !ev.end?.dateTime) return false;
    const start = new Date(ev.start.dateTime).getTime();
    const end = new Date(ev.end.dateTime).getTime();
    const nowTime = this.now.getTime();
    return nowTime >= start && nowTime <= end;
  }
}
