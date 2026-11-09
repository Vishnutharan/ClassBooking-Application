import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../core/services/student.service';
import { TeacherService } from '../../core/services/teacher.service';
import { ClassBookingService } from '../../core/services/class-booking.service';
import { TeacherProfile, ClassBooking, TimetableEvent } from '../../core/models/shared.models';
import { TimetableService } from '../../core/services/timetable.service';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { PaymentIntegrationService } from '../../core/services/payment-integration.service';
import { PaymentRecord } from '../../core/models/payment.models';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {
  private studentService = inject(StudentService);
  private bookingService = inject(ClassBookingService);
  private teacherService = inject(TeacherService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private timetableService = inject(TimetableService);
  private authService = inject(AuthService);
  private paymentService = inject(PaymentIntegrationService);

  currentUser: any = null;
  upcomingClasses: ClassBooking[] = [];
  recommendedTeachers: TeacherProfile[] = [];
  subjectsProgress: { subject: string; progress: number }[] = [];

  // Search & Filter
  allTeachers: TeacherProfile[] = [];
  filteredTeachers: TeacherProfile[] = [];
  searchFilters = {
    subject: '',
    level: '',
    medium: ''
  };

  stats = {
    totalClassesBooked: 0,
    completedClasses: 0,
    hoursStudied: 0,
    averageRating: 4.9,
    progressPercentage: 0
  };
  timetableEvents: TimetableEvent[] = [];
  recentActivity: any[] = [];
  recentPayments: PaymentRecord[] = [];
  isLoading = false;
  today = new Date();

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (isPlatformBrowser(this.platformId)) {
      this.loadDashboardData();
    }
  }

  get userInitials(): string {
    const name = this.currentUser?.fullName || 'Student';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }

  private loadDashboardData(): void {
    this.isLoading = true;

    forkJoin({
      summary: this.studentService.getSummary().pipe(catchError(() => of(null))),
      bookings: this.bookingService.getStudentBookings().pipe(catchError(() => of([]))),
      recommended: this.studentService.getRecommendedTeachers().pipe(catchError(() => of([]))),
      progress: this.studentService.getProgressReport().pipe(catchError(() => of(null))),
      allTeachers: this.teacherService.getAllTeachers().pipe(catchError(() => of([]))),
      timetable: this.timetableService.getTimetableForUser().pipe(catchError(() => of([]))),
      payments: this.paymentService.getStudentPayments().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ summary, bookings, recommended, progress, allTeachers, timetable, payments }) => {
        const safeBookings = bookings || [];
        this.upcomingClasses = safeBookings
          .filter(b => b.status === 'Confirmed' || b.status === 'Pending')
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 5);

        this.stats.totalClassesBooked = summary?.totalClasses ?? safeBookings.length;
        this.stats.completedClasses = summary?.completedClasses ?? safeBookings.filter(b => b.status === 'Completed').length;
        this.stats.hoursStudied = summary?.studyHours ?? this.calculateHours(safeBookings);
        this.stats.progressPercentage = summary?.progressPercentage ?? (this.stats.totalClassesBooked > 0 ? Math.min(100, Math.max(35, Math.round((this.stats.completedClasses / Math.max(1, this.stats.totalClassesBooked)) * 100))) : 25);
        this.stats.averageRating = summary?.averageRating || 4.9;

        this.recentActivity = progress?.activities || [];
        const rawProgress = progress?.subjectsProgress || [];
        this.subjectsProgress = rawProgress.length > 0 ? rawProgress : [
          { subject: 'GCSE Mathematics (Edexcel)', progress: 78 },
          { subject: 'A-Level Physics (AQA)', progress: 64 },
          { subject: 'English Literature', progress: 85 }
        ];

        const cleanTeachers = (allTeachers || []).filter(
          t => t.fullName && !t.fullName.toLowerCase().includes('workflow test')
        );
        const cleanRecommended = (recommended || []).filter(
          t => t.fullName && !t.fullName.toLowerCase().includes('workflow test')
        );

        this.allTeachers = cleanTeachers;
        this.filteredTeachers = cleanTeachers;
        this.timetableEvents = (timetable || []).slice(0, 5);
        this.recommendedTeachers = cleanRecommended.length > 0
          ? cleanRecommended.slice(0, 4)
          : cleanTeachers.slice(0, 4);
        this.recentPayments = (payments || []).slice(0, 4);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  navigateToTimetable(): void {
    this.router.navigate(['/timetable']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/student/details']);
  }

  private calculateHours(bookings: ClassBooking[]): number {
    return bookings
      .filter(b => b.status === 'Completed' || b.status === 'Confirmed')
      .reduce((sum, b) => {
        const start = new Date(`2000-01-01 ${b.startTime}`);
        const end = new Date(`2000-01-01 ${b.endTime}`);
        const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return sum + (isNaN(diff) || diff <= 0 ? 1 : diff);
      }, 0);
  }

  bookClass(): void {
    this.router.navigate(['/book-class']);
  }

  bookWithTeacher(teacherId: string): void {
    this.router.navigate(['/book-class'], { queryParams: { teacherId } });
  }

  payForBooking(bookingId: string): void {
    this.router.navigate(['/payment', bookingId]);
  }

  viewExamMaterials(): void {
    this.router.navigate(['/exam-materials']);
  }

  seePastPapers(): void {
    this.router.navigate(['/past-papers']);
  }

  findTeacher(): void {
    this.router.navigate(['/find-teacher']);
  }

  viewTeacherProfile(teacherId: string): void {
    this.router.navigate(['/teacher-profile', teacherId]);
  }

  viewBooking(bookingId: string): void {
    this.router.navigate(['/my-bookings']);
  }

  viewMyProgress(): void {
    this.router.navigate(['/student/progress']);
  }

  viewMyReviews(): void {
    this.router.navigate(['/my-reviews']);
  }

  viewLessonPlans(): void {
    this.router.navigate(['/student/lesson-plans']);
  }

  viewResources(): void {
    this.router.navigate(['/student/resources']);
  }

  applyFilters(): void {
    this.filteredTeachers = this.allTeachers.filter(teacher => {
      const matchesSubject = !this.searchFilters.subject ||
        teacher.subjects.some(s => s.name.toLowerCase().includes(this.searchFilters.subject.toLowerCase()));

      const matchesLevel = !this.searchFilters.level ||
        teacher.subjects.some(s => s.level === this.searchFilters.level);

      const matchesMedium = !this.searchFilters.medium ||
        teacher.subjects.some(s => s.medium === this.searchFilters.medium);

      return matchesSubject && matchesLevel && matchesMedium;
    });
  }

  clearFilters(): void {
    this.searchFilters = {
      subject: '',
      level: '',
      medium: ''
    };
    this.filteredTeachers = this.allTeachers;
  }

  logout(): void {
    this.authService.logout();
  }
}
