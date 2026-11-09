import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { StudentService } from '../../core/services/student.service';
import { Resource } from '../../core/models/shared.models';

@Component({
  selector: 'app-educational-content',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './educational-content.component.html',
  styleUrl: './educational-content.component.css'
})
export class EducationalContentComponent implements OnInit {
  private studentService = inject(StudentService);
  private notificationService = inject(NotificationService);

  contents: Resource[] = [];
  filteredContents: Resource[] = [];
  isLoading = false;

  selectedSubject = '';
  selectedLevel = '';
  selectedMedium = '';
  searchTerm = '';
  bookmarkedContents: Set<string> = new Set();

  subjects = ['Mathematics', 'Further Maths', 'Physics', 'Chemistry', 'Biology', 'English Literature', 'History', 'Geography', 'Economics', 'Computer Science'];
  levels = ['Primary', 'OLevel', 'ALevel'];
  mediums = ['English', 'Bilingual', 'French', 'Spanish'];

  ngOnInit(): void {
    this.loadContents();
  }

  private loadContents(): void {
    this.isLoading = true;
    const subject = this.selectedSubject || 'Mathematics';
    const level = this.selectedLevel || '';

    this.studentService.getStudyMaterials(subject, level).subscribe({
      next: (materials) => {
        this.contents = materials;
        this.filterContents();
        this.isLoading = false;
      },
      error: () => {
        this.notificationService.showError('Failed to load content');
        this.isLoading = false;
      }
    });
  }

  onSubjectChange(): void {
    this.loadContents();
  }

  private filterContents(): void {
    let filtered = this.contents;

    if (this.selectedMedium) {
      filtered = filtered.filter(c => c.description?.includes(this.selectedMedium));
    }

    if (this.searchTerm) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    this.filteredContents = filtered;
  }

  onFilterChange(): void {
    this.filterContents();
  }

  onSearch(): void {
    this.filterContents();
  }

  toggleBookmark(content: Resource): void {
    if (this.bookmarkedContents.has(content.id)) {
      this.bookmarkedContents.delete(content.id);
      this.notificationService.showInfo('Removed from bookmarks');
    } else {
      this.bookmarkedContents.add(content.id);
      this.notificationService.showSuccess('Added to bookmarks');
    }
  }

  viewContent(content: Resource): void {
    this.notificationService.showInfo(`Opening: ${content.title}`);
  }

  trackProgress(content: Resource): void {
    this.notificationService.showSuccess('Progress updated');
  }
}
