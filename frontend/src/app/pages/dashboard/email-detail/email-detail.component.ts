import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-email-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DatePipe],
  templateUrl: './email-detail.component.html',
  styleUrl: './email-detail.component.css'
})
export class EmailDetailComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  api = inject(ApiService);

  email: any = null;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      try {
        this.email = await this.api.getMessageDetail(id);
      } catch (err) {
        console.error('Email detail error', err);
        this.router.navigate(['/dashboard/inbox']);
      }
    }
  }
}
