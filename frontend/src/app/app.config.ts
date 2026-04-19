import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { LucideAngularModule, Inbox, Bell, Trash2, PenBox, Calendar, LogOut, Moon, Sun, ChevronRight, ChevronLeft, RefreshCw, CheckCircle, ShieldAlert, AlertCircle, Mail, Sparkles, Check } from 'lucide-angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), 
    provideHttpClient(withFetch()),
    importProvidersFrom(LucideAngularModule.pick({ Inbox, Bell, Trash2, PenBox, Calendar, LogOut, Moon, Sun, ChevronRight, ChevronLeft, RefreshCw, CheckCircle, ShieldAlert, AlertCircle, Mail, Sparkles, Check }))
  ]
};
