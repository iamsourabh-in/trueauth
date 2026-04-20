import { ApplicationConfig, importProvidersFrom, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { LucideAngularModule, Inbox, Bell, Trash2, PenBox, Calendar, LogOut, Moon, Sun, ChevronRight, ChevronLeft, RefreshCw, CheckCircle, ShieldAlert, AlertCircle, Mail, Sparkles, Check, Layout, MoreVertical, Menu, X, UserX, ClipboardCheck, Star, Play, PenTool, Database, Pause, Quote } from 'lucide-angular';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch()),
    importProvidersFrom(LucideAngularModule.pick({ Inbox, Bell, Trash2, PenBox, Calendar, LogOut, Moon, Sun, ChevronRight, ChevronLeft, RefreshCw, CheckCircle, ShieldAlert, AlertCircle, Mail, Sparkles, Check, Layout, MoreVertical, Menu, X, UserX, ClipboardCheck, Star, Play, PenTool, Database, Pause, Quote })),
    provideServiceWorker('ngsw-worker.js', {
        enabled: !isDevMode(),
        registrationStrategy: 'registerWhenStable:30000'
    })
]
};
