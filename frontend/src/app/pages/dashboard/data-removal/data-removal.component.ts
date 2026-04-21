import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-data-removal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="removal-page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Personal Data Removal</h2>
          <p class="page-sub">Scrub your digital footprint from data brokers and public databases.</p>
        </div>
        <button class="btn-primary" (click)="triggerScan()" [disabled]="syncing">
          <lucide-icon name="shield-check" [size]="15" color="white" [class.spin]="syncing"></lucide-icon>
          {{ syncing ? 'Processing...' : 'Start Scan & Remove' }}
        </button>
      </div>

      <div class="grid-container">
        <!-- Main Column -->
        <div class="main-column">
          <!-- Overview Card -->
          <div class="card">
            <div class="card-header">
              <div class="card-icon"><lucide-icon name="GlobeLock" [size]="20"></lucide-icon></div>
              <div>
                <h3>Automated Data Broker Removal</h3>
                <p>We automatically issue takedown requests to major data brokers.</p>
              </div>
            </div>
            <div class="card-body">
              <div class="brokers-list">
                <span class="broker-chip" *ngFor="let broker of brokers" [ngClass]="broker.status">
                  {{ broker.name }}
                  <lucide-icon *ngIf="broker.status === 'completed'" name="check-circle" [size]="14" class="success-icon"></lucide-icon>
                  <lucide-icon *ngIf="broker.status === 'sent'" name="check" [size]="14" class="pending-icon"></lucide-icon>
                  <span *ngIf="broker.status === 'pending'" class="mini-spinner"></span>
                </span>
                <span class="broker-chip pending-chip" *ngIf="brokers.length === 0">Loading brokers...</span>
              </div>
            </div>
          </div>

          <!-- Identity Details Card -->
          <div class="card">
            <div class="card-header">
              <div class="card-icon"><lucide-icon name="Users" [size]="20"></lucide-icon></div>
              <div>
                <h3>Your Details for Removal</h3>
                <p>Add aliases, numbers, and addresses to cover all bases.</p>
              </div>
            </div>
            <div class="card-body details-section">
              <div class="detail-group">
                <label>Emails</label>
                <div class="detail-inputs">
                  <input #emailInp type="email" placeholder="example&#64;trueauth.app" class="form-input">
                  <button class="btn-outline" (click)="addIdentity('email', emailInp.value); emailInp.value=''">Add</button>
                </div>
                <div class="tags-container">
                  <ng-container *ngFor="let iden of identities">
                    <span class="tag" *ngIf="iden.type === 'email'">{{ iden.value }}</span>
                  </ng-container>
                </div>
              </div>

              <div class="detail-group">
                <label>Phone Numbers</label>
                <div class="detail-inputs">
                  <input #phoneInp type="tel" placeholder="(555) 555-5555" class="form-input">
                  <button class="btn-outline" (click)="addIdentity('phone', phoneInp.value); phoneInp.value=''">Add</button>
                </div>
                <div class="tags-container">
                  <ng-container *ngFor="let iden of identities">
                    <span class="tag info" *ngIf="iden.type === 'phone'">{{ iden.value }}</span>
                  </ng-container>
                </div>
              </div>

              <div class="detail-group">
                <label>Addresses</label>
                <div class="detail-inputs">
                  <input #addrInp type="text" placeholder="123 Privacy Ln..." class="form-input">
                  <button class="btn-outline" (click)="addIdentity('address', addrInp.value); addrInp.value=''">Add</button>
                </div>
                <div class="tags-container">
                  <ng-container *ngFor="let iden of identities">
                     <span class="tag addr" *ngIf="iden.type === 'address'">{{ iden.value }}</span>
                  </ng-container>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Side Column -->
        <div class="side-column">
          <!-- Settings Card -->
          <div class="card">
            <div class="card-header-compact">
              <h3>Removal Settings</h3>
            </div>
            <div class="card-body settings-list">
              <div class="setting-item">
                <div class="setting-info">
                  <h4>Recurring Removals</h4>
                  <p>Check for newly posted data every month.</p>
                </div>
                <label class="switch">
                  <input type="checkbox" checked>
                  <span class="slider round"></span>
                </label>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <h4>Unlimited Custom Requests</h4>
                  <p>Found your data somewhere obscure? Paste the link.</p>
                </div>
                <button class="btn-text">Submit Request</button>
              </div>
            </div>
          </div>

          <!-- Support Card -->
          <div class="support-card shadow-sm">
            <div class="support-icon">
              <lucide-icon name="phone-call" [size]="24" color="white"></lucide-icon>
            </div>
            <div class="support-content">
              <h4>Live Phone Support</h4>
              <p>Need help navigating identity theft or custom unlistings?</p>
              <a href="tel:18005550199" class="support-tel">1-800-555-0199</a>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .removal-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .page-title { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem; }
    .page-sub { font-size: 0.875rem; color: var(--text-secondary); }
    
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--accent); color: white; border: none; border-radius: 0.625rem; cursor: pointer; font-size: 0.875rem; font-weight: 600; padding: 0.65rem 1.25rem; transition: all 0.2s; }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.2); }

    .grid-container {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 900px) {
      .grid-container {
        grid-template-columns: 2fr 1fr;
      }
    }

    .main-column, .side-column { display: flex; flex-direction: column; gap: 1.5rem; }

    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; overflow: hidden; }
    .card-header { display: flex; gap: 1rem; padding: 1.25rem; border-bottom: 1px solid var(--border); background: var(--surface2); }
    .card-header-compact { padding: 1.25rem; border-bottom: 1px solid var(--border); background: var(--surface2); }
    .card-icon { height: 40px; width: 40px; border-radius: 10px; background: var(--accent-subtle); color: var(--accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .card-header h3, .card-header-compact h3 { margin: 0 0 0.25rem 0; font-size: 1rem; font-weight: 700; color: var(--text-primary); }
    .card-header p { margin: 0; font-size: 0.85rem; color: var(--text-secondary); }
    
    .card-body { padding: 1.25rem; }

    .brokers-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .broker-chip {
      background: var(--surface2); padding: 0.4rem 0.75rem; border-radius: 99px;
      font-size: 0.85rem; font-weight: 600; color: var(--text-primary);
      display: inline-flex; align-items: center; gap: 0.4rem;
    }
    .success-icon { color: var(--success); }
    .broker-chip.sent { border: 1px solid var(--accent); color: var(--accent); background: var(--accent-subtle); }
    .broker-chip.completed { background: rgba(34,197,94,0.1); color: var(--success); }
    .pending-icon { color: var(--accent); }
    .broker-chip.pending-chip { border: 1px dashed var(--text-muted); background: transparent; color: var(--text-secondary); cursor: default; }

    .spin { animation: spin 1s linear infinite; }
    .mini-spinner { width: 14px; height: 14px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .details-section { display: flex; flex-direction: column; gap: 1.25rem; }
    .detail-group label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem; }
    .detail-inputs { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
    .form-input { flex: 1; padding: 0.6rem 1rem; border-radius: 0.5rem; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary); font-size: 0.9rem; }
    .form-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-subtle); }
    .btn-outline { padding: 0 1rem; border-radius: 0.5rem; border: 1px solid var(--border); background: var(--surface2); color: var(--text-primary); font-weight: 600; cursor: pointer; transition: all 0.2s;}
    .btn-outline:hover { background: var(--accent-subtle); color: var(--accent); border-color: var(--accent); }
    
    .tags-container { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .tag { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.6rem; background: var(--surface2); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; font-size: 0.8rem; font-weight: 600;}
    .tag.info { background: rgba(56, 189, 248, 0.1); color: #0284c7; border-color: rgba(56, 189, 248, 0.2); }
    .tag.addr { background: rgba(168, 85, 247, 0.1); color: #9333ea; border-color: rgba(168, 85, 247, 0.2); }

    .settings-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .setting-item { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .setting-info h4 { margin: 0 0 0.25rem 0; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); }
    .setting-info p { margin: 0; font-size: 0.8rem; color: var(--text-secondary); }
    
    .btn-text { background: none; border: none; color: var(--accent); font-weight: 700; font-size: 0.85rem; cursor: pointer; padding: 0; }
    .btn-text:hover { text-decoration: underline; }

    /* Toggle Switch */
    .switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0;}
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border); transition: .4s; }
    .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; }
    input:checked + .slider { background-color: var(--accent); }
    input:focus + .slider { box-shadow: 0 0 1px var(--accent); }
    input:checked + .slider:before { transform: translateX(20px); }
    .slider.round { border-radius: 24px; }
    .slider.round:before { border-radius: 50%; }

    /* Support Card */
    .support-card {
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      border-radius: 1rem; padding: 1.5rem; color: white;
      display: flex; gap: 1rem; align-items: center;
    }
    .support-icon {
      background: rgba(255,255,255,0.2); height: 50px; width: 50px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .support-content h4 { margin: 0 0 0.25rem 0; font-size: 1.05rem; font-weight: 800; }
    .support-content p { margin: 0 0 0.5rem 0; font-size: 0.85rem; opacity: 0.9; }
    .support-tel { display: inline-block; font-size: 1.25rem; font-weight: 900; color: white; text-decoration: none; }
  `]
})
export class DataRemovalComponent implements OnInit {
  api = inject(ApiService);
  brokers: any[] = [];
  identities: any[] = [];
  syncing = false;

  async ngOnInit() {
    await this.loadStatus();
  }

  async loadStatus() {
    try {
      const res = await this.api.getRemovalStatus();
      this.brokers = res.statuses || [];
    } catch (e) {
      console.error(e);
    }
  }

  async addIdentity(type: 'email'|'phone'|'address', value: string) {
    if (!value) return;
    try {
       await this.api.saveIdentity(type, value);
       this.identities.push({ type, value });
    } catch {}
  }

  async triggerScan() {
    this.syncing = true;
    try {
       await this.api.triggerRemoval();
       // Wait a moment for queue to process initial steps, then reload
       setTimeout(() => this.loadStatus(), 2000);
    } catch {} 
    finally { this.syncing = false; }
  }
}
