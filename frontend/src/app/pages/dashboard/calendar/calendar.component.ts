import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DatePipe, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
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
