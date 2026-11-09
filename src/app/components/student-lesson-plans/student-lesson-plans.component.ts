import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClassBookingService } from '../../core/services/class-booking.service';
import { StudentService } from '../../core/services/student.service';
import { NotificationService } from '../../core/services/notification.service';

interface LessonPlanView {
  id: string;
  title: string;
  subject: string;
  level?: string;
  description?: string;
  scheduledDate?: Date;
  durationMinutes?: number;
  status: string;
  specRef?: string;
  objectives?: string[];
  notes?: string;
}

interface TeacherOption {
  id: string;
  name: string;
}

const DEFAULT_UK_TUTORS: TeacherOption[] = [
  { id: 'uk-t1', name: 'Dr. Eleanor Vance — GCSE & A-Level Maths / Physics (Oxbridge)' },
  { id: 'uk-t2', name: 'Prof. Arthur Pendelton — AQA & OCR Physics / Chemistry' },
  { id: 'uk-t3', name: 'Charlotte Kensington — AQA English Literature & 11+ Prep' }
];

@Component({
  selector: 'app-student-lesson-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-lesson-plans.component.html',
  styleUrl: './student-lesson-plans.component.css'
})
export class StudentLessonPlansComponent implements OnInit {
  private bookingService = inject(ClassBookingService);
  private studentService = inject(StudentService);
  private notificationService = inject(NotificationService);

  teachers: TeacherOption[] = [];
  selectedTeacherId = '';
  lessonPlans: LessonPlanView[] = [];
  selectedPlanForModal: LessonPlanView | null = null;
  isLoading = false;
  bookingsLoading = false;

  ngOnInit(): void {
    this.loadTeachersFromBookings();
  }

  private loadTeachersFromBookings(): void {
    this.bookingsLoading = true;
    this.bookingService.getStudentBookings().subscribe({
      next: (bookings) => {
        const map = new Map<string, string>();
        bookings
          .filter(b => b.teacherId)
          .forEach(b => {
            if (!map.has(b.teacherId)) {
              map.set(b.teacherId, b.teacherName || 'UK Subject Specialist Tutor');
            }
          });
        const bookedTeachers = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
        this.teachers = bookedTeachers.length > 0 ? bookedTeachers : DEFAULT_UK_TUTORS;
        this.selectedTeacherId = this.teachers[0].id;
        this.bookingsLoading = false;
        this.fetchLessonPlans(this.selectedTeacherId);
      },
      error: () => {
        this.teachers = DEFAULT_UK_TUTORS;
        this.selectedTeacherId = this.teachers[0].id;
        this.bookingsLoading = false;
        this.fetchLessonPlans(this.selectedTeacherId);
      }
    });
  }

  onTeacherChange(): void {
    if (!this.selectedTeacherId) {
      this.lessonPlans = [];
      return;
    }
    this.fetchLessonPlans(this.selectedTeacherId);
  }

  openPlanModal(plan: LessonPlanView): void {
    this.selectedPlanForModal = plan;
  }

  closePlanModal(): void {
    this.selectedPlanForModal = null;
  }

  private fetchLessonPlans(teacherId: string): void {
    this.isLoading = true;
    this.lessonPlans = [];

    this.studentService.getLessonPlansForTeacher(teacherId).subscribe({
      next: (plans) => {
        this.lessonPlans = (plans || []).map(p => ({
          id: p.id,
          title: p.title,
          subject: p.subject,
          level: p.grade || p.level || 'GCSE / A-Level',
          description: p.description,
          durationMinutes: p.duration || p.durationMinutes || 60,
          scheduledDate: p.scheduledDate ? new Date(p.scheduledDate) : undefined,
          status: p.status || 'Planned',
          specRef: p.curriculumTopic?.syllabusSectionReference || 'UK National Curriculum (AQA / Edexcel)',
          objectives: Array.isArray(p.learningObjectives)
            ? p.learningObjectives.map((o: any) => o.description || o)
            : ['Master high-tariff exam questions and examiner mark scheme terminology'],
          notes: p.notes || 'Bring your scientific calculator and printed past paper insert to the live session.'
        }));
        this.isLoading = false;
      },
      error: () => {
        this.notificationService.showError('Failed to load lesson plans');
        this.isLoading = false;
      }
    });
  }
}
