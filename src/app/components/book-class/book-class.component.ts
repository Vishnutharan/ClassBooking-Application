import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { ClassBookingService, BookingRequest } from '../../core/services/class-booking.service';
import { TeacherService } from '../../core/services/teacher.service';
import { CalendarComponent } from '../shared/calendar/calendar.component';
import { EventInput, EventClickArg } from '@fullcalendar/core';
import { TeacherAvailabilitySlot, TeacherProfile } from '../../core/models/shared.models';

@Component({
  selector: 'app-book-class',
  standalone: true,
  imports: [CommonModule, CalendarComponent, FormsModule],
  templateUrl: './book-class.component.html',
  styleUrl: './book-class.component.css'
})
export class BookClassComponent implements OnInit {
  private bookingService = inject(ClassBookingService);
  private teacherService = inject(TeacherService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  calendarEvents: EventInput[] = [];
  currentUser: any;
  teachers: TeacherProfile[] = [];
  selectedTeacherId = '';
  selectedTeacher?: TeacherProfile;
  availabilitySlots: TeacherAvailabilitySlot[] = [];
  quickAvailableSlots: TeacherAvailabilitySlot[] = [];

  // Pre-selection Context
  preSelectedSubject = '';
  preSelectedGrade = '';

  gradeOptions = [
    'Year 7 (KS3)', 'Year 8 (KS3)', 'Year 9 (KS3)',
    'Year 10 (GCSE)', 'Year 11 (GCSE)',
    'Year 12 (A-Level)', 'Year 13 (A-Level)',
    '11+ Prep', 'Primary (KS1/KS2)', 'University'
  ];

  timeSlotOptions = [
    { start: '09:00', end: '10:00', label: '09:00 AM – 10:00 AM' },
    { start: '11:00', end: '12:00', label: '11:00 AM – 12:00 PM' },
    { start: '14:00', end: '15:00', label: '02:00 PM – 03:00 PM' },
    { start: '16:00', end: '17:00', label: '04:00 PM – 05:00 PM' },
    { start: '18:00', end: '19:00', label: '06:00 PM – 07:00 PM' }
  ];

  showBookingDialog = false;
  isCustomSlotBooking = false;
  customSlotDate = '';
  customSlotTimeIndex = 0;
  selectedSlot: any = null;

  bookingForm = {
    subject: '',
    notes: '',
    classType: 'Personal_1_1' as 'Personal_1_1' | 'Group' | 'OneTime' | 'Recurring',
    mode: 'ONLINE' as 'ONLINE' | 'IN_PERSON',
    gradeLevel: 'Year 11 (GCSE)',
    school: '',
    parentName: '',
    parentContact: ''
  };

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.customSlotDate = this.formatDate(tomorrow);

    this.route.queryParams.subscribe(params => {
      if (params['teacherId']) {
        this.selectedTeacherId = params['teacherId'];
      }
      if (params['subject']) {
        this.preSelectedSubject = params['subject'];
      }
      if (params['grade']) {
        this.preSelectedGrade = params['grade'];
      }
      if (this.teachers.length > 0 && this.selectedTeacherId) {
        this.onTeacherSelected(this.selectedTeacherId);
      }
    });

    this.loadTeachers();
  }

  loadTeachers(): void {
    this.teacherService.getAllTeachers().subscribe({
      next: (teachers) => {
        // Filter out any unconfigured test teachers with no name or subjects if real teachers exist
        const realTeachers = (teachers || []).filter(
          t => t.fullName && !t.fullName.toLowerCase().includes('workflow test')
        );
        this.teachers = realTeachers.length > 0 ? realTeachers : (teachers || []);

        if (this.selectedTeacherId && this.teachers.some(t => t.id === this.selectedTeacherId)) {
          this.onTeacherSelected(this.selectedTeacherId);
        } else if (this.teachers.length > 0) {
          this.onTeacherSelected(this.teachers[0].id);
        }
      },
      error: () => this.notificationService.showError('Failed to load teachers')
    });
  }

  refreshSelectedTeacher(): void {
    if (this.selectedTeacherId) {
      this.onTeacherSelected(this.selectedTeacherId);
      this.notificationService.showInfo('Schedule refreshed');
    } else {
      this.notificationService.showInfo('Select a tutor to view their schedule');
    }
  }

  onTeacherSelected(teacherId: string): void {
    this.selectedTeacherId = teacherId;
    this.selectedTeacher = this.teachers.find(t => t.id === teacherId);
    this.selectedSlot = null;
    this.calendarEvents = [];
    this.quickAvailableSlots = [];

    if (!teacherId) {
      return;
    }

    const startRange = new Date();
    startRange.setDate(startRange.getDate() - 1);
    const endRange = new Date();
    endRange.setDate(endRange.getDate() + 30);

    this.teacherService.getTeacherAvailabilitySlots(teacherId, startRange, endRange).subscribe({
      next: (slots) => {
        const effectiveSlots = (slots && slots.length > 0)
          ? slots
          : this.buildFallbackSlots(teacherId);
        this.availabilitySlots = effectiveSlots;
        this.quickAvailableSlots = effectiveSlots
          .filter(s => (s.status || 'Available') === 'Available')
          .slice(0, 12);
        this.calendarEvents = this.generateEventsForTeacher(effectiveSlots);
      },
      error: () => {
        const fallback = this.buildFallbackSlots(teacherId);
        this.availabilitySlots = fallback;
        this.quickAvailableSlots = fallback.slice(0, 12);
        this.calendarEvents = this.generateEventsForTeacher(fallback);
      }
    });
  }

  private buildFallbackSlots(teacherId: string): TeacherAvailabilitySlot[] {
    const generated: TeacherAvailabilitySlot[] = [];
    const base = new Date();
    const times = [
      { start: '09:00', end: '10:00' },
      { start: '11:00', end: '12:00' },
      { start: '14:00', end: '15:00' },
      { start: '16:00', end: '17:00' }
    ];
    for (let d = 0; d < 14; d++) {
      const date = new Date(base);
      date.setDate(base.getDate() + d);
      const dateStr = this.formatDate(date);
      for (const t of times) {
        generated.push({
          id: `gen-${teacherId}-${dateStr}-${t.start}`,
          teacherProfileId: teacherId,
          date: date,
          startTime: t.start,
          endTime: t.end,
          status: 'Available'
        });
      }
    }
    return generated;
  }

  private generateEventsForTeacher(slots: TeacherAvailabilitySlot[]): EventInput[] {
    const teacher = this.selectedTeacher;

    return slots.map(slot => {
      const status = slot.status || 'Available';
      const isAvailable = status === 'Available';
      const color = isAvailable ? '#16a34a' : status === 'Pending' ? '#f59e0b' : '#64748b';
      const dateStr = this.formatDate(slot.date);

      return {
        id: `slot-${slot.id}`,
        title: isAvailable ? `Available • £${teacher?.hourlyRate || 35}/hr` : `${status}`,
        start: `${dateStr}T${slot.startTime}`,
        end: `${dateStr}T${slot.endTime}`,
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          type: 'slot',
          slotId: slot.id,
          status,
          teacherId: this.selectedTeacherId,
          teacherName: teacher?.fullName,
          teacherRate: teacher?.hourlyRate || 35,
          subjects: teacher?.subjects || [],
          date: dateStr,
          startTime: slot.startTime,
          endTime: slot.endTime
        }
      };
    });
  }

  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  selectQuickSlot(slot: TeacherAvailabilitySlot): void {
    const teacher = this.selectedTeacher;
    if (!teacher) return;
    const dateStr = this.formatDate(slot.date);
    this.openBookingWithProps({
      type: 'slot',
      slotId: slot.id,
      status: slot.status || 'Available',
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      teacherRate: teacher.hourlyRate || 35,
      subjects: teacher.subjects || [],
      date: dateStr,
      startTime: slot.startTime,
      endTime: slot.endTime
    }, false);
  }

  openCustomBookingModal(): void {
    const teacher = this.selectedTeacher;
    if (!teacher) {
      this.notificationService.showWarning('Please select a tutor first');
      return;
    }
    const chosenTime = this.timeSlotOptions[this.customSlotTimeIndex] || this.timeSlotOptions[0];
    this.openBookingWithProps({
      type: 'slot',
      slotId: 'custom',
      status: 'Available',
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      teacherRate: teacher.hourlyRate || 35,
      subjects: teacher.subjects || [],
      date: this.customSlotDate,
      startTime: chosenTime.start,
      endTime: chosenTime.end
    }, true);
  }

  onCustomTimeChange(): void {
    if (this.selectedSlot && this.isCustomSlotBooking) {
      const chosen = this.timeSlotOptions[this.customSlotTimeIndex] || this.timeSlotOptions[0];
      this.selectedSlot.date = this.customSlotDate;
      this.selectedSlot.startTime = chosen.start;
      this.selectedSlot.endTime = chosen.end;
    }
  }

  onEventClicked(arg: EventClickArg): void {
    const props = arg.event.extendedProps;

    if (!this.selectedTeacherId) {
      this.notificationService.showWarning('Please choose a tutor first');
      return;
    }

    if (props['type'] !== 'slot') {
      this.notificationService.showWarning('Select a green slot to book');
      return;
    }

    if (props['status'] !== 'Available') {
      this.notificationService.showWarning('This slot is already taken or awaiting approval');
      return;
    }

    this.openBookingWithProps(props, false);
  }

  private openBookingWithProps(props: any, isCustom: boolean): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.notificationService.showWarning('Please login to book a class');
      this.router.navigate(['/auth'], { queryParams: { mode: 'login' } });
      return;
    }

    this.isCustomSlotBooking = isCustom;
    this.selectedSlot = { ...props };
    this.showBookingDialog = true;

    const subjects = props['subjects'] || [];
    if (this.preSelectedSubject) {
      const hasSubject = subjects.some((s: any) => s.name === this.preSelectedSubject);
      if (hasSubject || subjects.length === 0) {
        this.bookingForm.subject = this.preSelectedSubject;
      } else {
        this.bookingForm.subject = subjects[0].name;
      }
    } else if (subjects.length > 0) {
      this.bookingForm.subject = subjects[0].name;
    } else {
      this.bookingForm.subject = 'Mathematics';
    }

    if (this.preSelectedGrade) {
      this.bookingForm.gradeLevel = this.preSelectedGrade;
    } else if (!this.bookingForm.gradeLevel) {
      this.bookingForm.gradeLevel = 'Year 11 (GCSE)';
    }
  }

  confirmBooking(): void {
    if (this.isCustomSlotBooking) {
      this.onCustomTimeChange();
    }

    if (!this.bookingForm.subject) {
      this.notificationService.showWarning('Please select a subject');
      return;
    }

    const bookingRequest: BookingRequest = {
      teacherId: this.selectedSlot.teacherId,
      subject: this.bookingForm.subject,
      date: new Date(this.selectedSlot.date),
      startTime: this.selectedSlot.startTime,
      endTime: this.selectedSlot.endTime,
      classType: this.bookingForm.classType as any,
      mode: this.bookingForm.mode,
      bookingGradeLevel: this.bookingForm.gradeLevel || 'Year 11 (GCSE)',
      notes: this.bookingForm.notes,
      school: this.bookingForm.school,
      parentName: this.bookingForm.parentName,
      parentContact: this.bookingForm.parentContact
    };

    this.bookingService.createBooking(bookingRequest).subscribe({
      next: (response) => {
        this.notificationService.showSuccess(response.message || 'Class booked successfully!');
        this.closeBookingDialog();
        this.onTeacherSelected(this.selectedTeacherId);
        const bookingId = response.id || response.booking?.id;
        if (bookingId) {
          this.router.navigate(['/payment', bookingId]);
        } else {
          this.router.navigate(['/my-bookings']);
        }
      },
      error: (err) => {
        const message = err?.error?.message || 'Failed to create booking';
        this.notificationService.showError(message);
      }
    });
  }

  closeBookingDialog(): void {
    this.showBookingDialog = false;
    this.isCustomSlotBooking = false;
    this.selectedSlot = null;
    this.bookingForm = {
      subject: '',
      notes: '',
      classType: 'Personal_1_1',
      mode: 'ONLINE',
      gradeLevel: 'Year 11 (GCSE)',
      school: '',
      parentName: '',
      parentContact: ''
    };
  }
}
