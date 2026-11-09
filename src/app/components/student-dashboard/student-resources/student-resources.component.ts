import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceService, Resource } from '../../../core/services/resource.service';

@Component({
  selector: 'app-student-resources',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="resources-page">
      <div class="resources-shell">
        <header class="resources-hero">
          <div>
            <span class="eyebrow">🇬🇧 UK Tuition Library</span>
            <h1>My Study Resources & Revision Packs</h1>
            <p>Download teacher-uploaded GCSE & A-Level revision notes, worked solutions, and formula sheets.</p>
          </div>
          <div class="stat-pill">
            <strong>{{ resources.length }}</strong>
            <span>Available Files</span>
          </div>
        </header>

        <div *ngIf="loading" class="empty-box">Loading UK study resources...</div>

        <div *ngIf="!loading && resources.length === 0" class="empty-box">
          <div class="empty-icon">📂</div>
          <h3>No study resources assigned to you yet</h3>
          <p>Resources uploaded by your UK tutors will appear here automatically.</p>
        </div>

        <div *ngIf="!loading && resources.length > 0" class="resources-grid">
          <article *ngFor="let resource of resources" class="resource-card">
            <div class="card-top">
              <div class="type-icon">{{ getIcon(resource.type) }}</div>
              <span class="subj-badge">{{ resource.subject }}</span>
            </div>

            <div class="card-body">
              <h3>{{ resource.title }}</h3>
              <p>{{ resource.description || 'Structured UK curriculum revision material and practice exercises.' }}</p>
            </div>

            <div class="card-footer">
              <span class="date-label">{{ resource.uploadedAt | date:'dd MMM yyyy' }}</span>
              <a [href]="resource.filePath" target="_blank" rel="noopener" class="download-btn">
                ↓ Download
              </a>
            </div>
          </article>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .resources-page {
      min-height: calc(100vh - 64px);
      background: #f1f5f9;
      padding: 1.5rem;
    }
    .resources-shell {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .resources-hero {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4f46e5 100%);
      border-radius: 20px;
      padding: 1.65rem 2rem;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.25rem;
      flex-wrap: wrap;
    }
    .eyebrow {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0.22rem 0.65rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.14);
      color: #e0e7ff;
      margin-bottom: 0.45rem;
    }
    .resources-hero h1 {
      color: #ffffff;
      font-size: clamp(1.4rem, 2.2vw, 1.9rem);
      font-weight: 800;
      margin: 0 0 0.25rem;
    }
    .resources-hero p {
      color: #c7d2fe;
      font-size: 0.9rem;
      margin: 0;
    }
    .stat-pill {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0.75rem 1.25rem;
      border-radius: 14px;
      text-align: center;
    }
    .stat-pill strong {
      display: block;
      font-size: 1.5rem;
      font-weight: 800;
      color: #ffffff;
    }
    .stat-pill span {
      font-size: 0.74rem;
      color: #c7d2fe;
    }
    .resources-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.15rem;
    }
    .resource-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 1.35rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1rem;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .type-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #eef2ff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
    }
    .subj-badge {
      font-size: 0.74rem;
      font-weight: 700;
      padding: 0.22rem 0.65rem;
      border-radius: 999px;
      background: #eef2ff;
      color: #4f46e5;
    }
    .card-body h3 {
      font-size: 1.02rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.3rem;
    }
    .card-body p {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.85rem;
      border-top: 1px solid #f1f5f9;
    }
    .date-label {
      font-size: 0.76rem;
      color: #94a3b8;
    }
    .download-btn {
      padding: 0.45rem 0.9rem;
      border-radius: 9px;
      background: #4f46e5;
      color: #ffffff;
      font-size: 0.8rem;
      font-weight: 700;
      text-decoration: none;
    }
    .empty-box {
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 18px;
      padding: 3rem 1.5rem;
      text-align: center;
    }
    .empty-icon { font-size: 2rem; margin-bottom: 0.4rem; }
  `]
})
export class StudentResourcesComponent implements OnInit {
  resources: Resource[] = [];
  loading: boolean = true;

  constructor(private resourceService: ResourceService) { }

  ngOnInit(): void {
    this.resourceService.getStudentResources().subscribe({
      next: (data: Resource[]) => {
        this.resources = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error fetching resources', err);
        this.loading = false;
      }
    });
  }

  getIcon(type: string): string {
    switch ((type || '').toLowerCase()) {
      case 'pdf': return '📄';
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'quiz': return '📝';
      default: return '📁';
    }
  }
}
