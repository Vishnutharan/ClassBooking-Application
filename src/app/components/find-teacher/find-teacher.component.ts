import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TeacherProfile } from '../../core/models/shared.models';
import { TeacherService } from '../../core/services/teacher.service';
import { NotificationService } from '../../core/services/notification.service';
import { finalize } from 'rxjs';

interface TeacherCardView {
  id: string;
  name: string;
  subjects: string[];
  grades: string[];
  medium: string[];
  teachingMode: string;
  classTypes: string[];
  rate: number;
  rating: number;
  profilePicture?: string;
  verified: boolean;
}

@Component({
  selector: 'app-find-teacher',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './find-teacher.component.html',
  styleUrl: './find-teacher.component.css'
})
export class FindTeacherComponent implements OnInit {
  private teacherService = inject(TeacherService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  filters = { subject: '', grade: '', medium: '', teachingMode: '', classType: '' };
  teacherCards: TeacherCardView[] = [];
  filteredCards: TeacherCardView[] = [];
  isLoading = false;
  subjectOptions: string[] = [];
  gradeOptions = ['Year 7 (KS3)', 'Year 8 (KS3)', 'Year 9 (KS3)', 'Year 10 (GCSE)', 'Year 11 (GCSE)', 'Year 12 (A-Level)', 'Year 13 (A-Level)', '11+ Prep', 'Primary (KS1/KS2)', 'University'];
  mediumOptions = ['English', 'Bilingual', 'French', 'Spanish', 'German', 'Mandarin'];
  teachingModeOptions = [
    { value: 'ONLINE', label: 'Online' },
    { value: 'IN_PERSON', label: 'In person' },
    { value: 'BOTH', label: 'Online or in person' }
  ];
  classTypeOptions = [
    { value: 'PERSONAL_1_1', label: 'One to one' },
    { value: 'GROUP', label: 'Group' }
  ];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const search = params.get('search') || params.get('subject');
      if (search) this.filters.subject = search;
      this.applyFilters(false);
    });
    this.fetchTeachers();
  }

  fetchTeachers(): void {
    this.isLoading = true;
    this.teacherService.getAllTeachers().pipe(finalize(() => this.isLoading = false)).subscribe({
      next: teachers => {
        this.teacherCards = this.mapToCards(teachers || []);
        this.subjectOptions = Array.from(new Set(this.teacherCards.flatMap(card => card.subjects))).sort();
        this.applyFilters(false);
      },
      error: () => {
        this.notificationService.showError('Could not load teachers right now. Please try again.');
        this.filteredCards = [];
      },
    });
  }

  refreshList(): void { this.fetchTeachers(); }

  applyFilters(showMessages = true): void {
    const subject = this.filters.subject.trim().toLowerCase();
    this.filteredCards = this.teacherCards.filter(card =>
      (!subject || card.subjects.some(value => value.toLowerCase().includes(subject)) || card.name.toLowerCase().includes(subject)) &&
      (!this.filters.grade || card.grades.includes(this.filters.grade)) &&
      (!this.filters.medium || card.medium.includes(this.filters.medium)) &&
      (!this.filters.teachingMode || card.teachingMode === this.filters.teachingMode) &&
      (!this.filters.classType || card.classTypes.includes(this.filters.classType))
    );
    if (!this.filteredCards.length && showMessages && this.teacherCards.length) {
      this.notificationService.showInfo('No teachers match these filters. Try removing a filter.');
    }
  }

  clearFilters(): void {
    this.filters = { subject: '', grade: '', medium: '', teachingMode: '', classType: '' };
    void this.router.navigate([], { relativeTo: this.route, queryParams: { search: null, subject: null }, queryParamsHandling: 'merge' });
    this.filteredCards = [...this.teacherCards];
  }

  formatClassTypes(types: string[]): string {
    return types.map(type => type === 'PERSONAL_1_1' ? 'One to one' : type === 'GROUP' ? 'Group' : type).join(', ') || 'Class type not listed';
  }

  viewProfile(teacherId: string): void {
    if (!teacherId) return;
    void this.router.navigate(['/teacher-profile', teacherId], {
      queryParams: { subject: this.filters.subject || null, grade: this.filters.grade || null }
    });
  }

  bookClass(teacherId: string): void {
    if (!teacherId) return;
    void this.router.navigate(['/book-class'], { queryParams: { teacherId } });
  }

  private mapToCards(teachers: TeacherProfile[]): TeacherCardView[] {
    return teachers.map(teacher => ({
      id: teacher.id,
      name: teacher.fullName || 'Teacher',
      subjects: [...new Set((teacher.subjects || []).map(subject => subject.name).filter(Boolean))],
      grades: [...new Set((teacher.subjects || []).flatMap(subject =>
        (subject.grades || '').split(',').map(grade => grade.trim()).filter(Boolean)))],
      medium: [...new Set((teacher.subjects || []).map(subject => subject.medium).filter(Boolean))],
      teachingMode: teacher.teachingMode || 'ONLINE',
      classTypes: [...new Set((teacher.subjects || []).flatMap(subject => subject.classTypes || []))],
      rate: teacher.hourlyRate ?? 0,
      rating: teacher.averageRating ?? 0,
      profilePicture: teacher.profilePicture,
      verified: teacher.verificationStatus === 'Verified'
    }));
  }
}
