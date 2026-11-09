import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentService } from '../../../core/services/student.service';
import { Resource } from '../../../core/models/shared.models';

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

        <div *ngIf="isLoading" class="loading-box">
          <p>Loading study resources...</p>
        </div>

        <div *ngIf="!isLoading && resources.length === 0" class="empty-box">
          <div class="empty-icon">📂</div>
          <h3>No study resources uploaded yet</h3>
          <p>Resources shared by your UK tutors will automatically appear here for instant download.</p>
        </div>

        <div *ngIf="!isLoading && resources.length > 0" class="resources-grid">
          <article *ngFor="let resource of resources" class="resource-card">
            <div class="resource-card-top">
              <div class="type-icon" [ngClass]="resource.type.toLowerCase()">
                <span *ngIf="resource.type === 'PDF'">📄</span>
                <span *ngIf="resource.type === 'VIDEO'">🎬</span>
                <span *ngIf="resource.type === 'LINK'">🔗</span>
                <span *ngIf="resource.type !== 'PDF' && resource.type !== 'VIDEO' && resource.type !== 'LINK'">📘</span>
              </div>
              <span class="type-badge">{{ resource.type }}</span>
            </div>

            <div class="resource-body">
              <h3>{{ resource.title }}</h3>
              <p>{{ resource.description || 'GCSE / A-Level structured revision material and practice exercises.' }}</p>
            </div>

            <div class="resource-footer">
              <div class="meta-tags">
                <span class="tag">{{ resource.subject }}</span>
                <span class="tag muted" *ngIf="resource.size">{{ resource.size }}</span>
              </div>
              <a [href]="resource.url" target="_blank" rel="noopener" class="download-btn">
                {{ resource.type === 'LINK' ? 'Open Link ↗' : 'Download ↓' }}
              </a>
            </div>
          </article>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .resources-page {
      min-height: calc(100vh - 60px);
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 2rem 1.5rem 3.5rem;
    }
    .resources-shell {
      max-width: 1360px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .resources-hero {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%);
      border-radius: 22px;
      padding: 2rem 2.25rem;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      flex-wrap: wrap;
      box-shadow: 0 18px 36px -14px rgba(49, 46, 129, 0.35);
    }
    .eyebrow {
      display: inline-block;
      font-size: 0.74rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0.25rem 0.7rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.14);
      color: #e0e7ff;
      border: 1px solid rgba(255, 255, 255, 0.22);
      margin-bottom: 0.55rem;
    }
    .resources-hero h1 {
      color: #ffffff;
      font-size: clamp(1.5rem, 2.3vw, 2.05rem);
      font-weight: 800;
      margin: 0 0 0.35rem;
    }
    .resources-hero p {
      color: #c7d2fe;
      margin: 0;
      font-size: 0.94rem;
    }
    .stat-pill {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0.8rem 1.25rem;
      border-radius: 16px;
      text-align: center;
    }
    .stat-pill strong {
      display: block;
      font-size: 1.6rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.1;
    }
    .stat-pill span {
      font-size: 0.75rem;
      color: #c7d2fe;
    }
    .resources-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
      gap: 1.25rem;
    }
    .resource-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 1.45rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1.1rem;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
      transition: all 0.18s ease;
    }
    .resource-card:hover {
      transform: translateY(-3px);
      border-color: #c7d2fe;
      box-shadow: 0 14px 28px -10px rgba(79, 70, 229, 0.14);
    }
    .resource-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .type-icon {
      width: 46px;
      height: 46px;
      border-radius: 13px;
      background: #eef2ff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
    }
    .type-badge {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.22rem 0.6rem;
      border-radius: 999px;
      background: #f1f5f9;
      color: #475569;
    }
    .resource-body h3 {
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.35rem;
    }
    .resource-body p {
      font-size: 0.86rem;
      color: #64748b;
      margin: 0;
      line-height: 1.55;
    }
    .resource-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding-top: 0.9rem;
      border-top: 1px solid #f1f5f9;
    }
    .meta-tags {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .tag {
      font-size: 0.74rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      background: #eef2ff;
      color: #4f46e5;
    }
    .tag.muted {
      background: #f8fafc;
      color: #64748b;
    }
    .download-btn {
      padding: 0.5rem 0.95rem;
      border-radius: 10px;
      background: #4f46e5;
      color: #ffffff;
      font-size: 0.8rem;
      font-weight: 700;
      text-decoration: none;
      white-space: nowrap;
    }
    .download-btn:hover {
      background: #4338ca;
    }
    .empty-box, .loading-box {
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 20px;
      padding: 3rem 1.5rem;
      text-align: center;
    }
    .empty-icon {
      font-size: 2.2rem;
      margin-bottom: 0.5rem;
    }
  `]
})
export class StudentResourcesComponent implements OnInit {
  private studentService = inject(StudentService);
  resources: Resource[] = [];
  isLoading = true;

  ngOnInit(): void {
    this.loadResources();
  }

  private loadResources(): void {
    this.studentService.getResources().subscribe({
      next: (data) => {
        this.resources = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load resources', err);
        this.isLoading = false;
      }
    });
  }
}
