import { Component, inject, OnInit } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { ClassBookingService } from '../../core/services/class-booking.service';
import { TeacherService } from '../../core/services/teacher.service';
import { CalendarComponent } from '../shared/calendar/calendar.component';
import { EventInput, DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherAvailabilitySlot } from '../../core/models/shared.models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-manage-schedule',
  standalone: true,
  imports: [CommonModule, CalendarComponent, FormsModule],
  templateUrl: './manage-schedule.component.html',
  styleUrl: './manage-schedule.component.css'
})
export class ManageScheduleComponent implements OnInit {
  private bookingService = inject(ClassBookingService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private teacherService = inject(TeacherService);

  calendarEvents: EventInput[] = [];
  currentUser: any;
  availabilitySlots: TeacherAvailabilitySlot[] = [];

  // Add Availability Modal
  showAvailabilityModal = false;
  availabilityForm = {
    date: '',
    startTime: '16:00',
    endTime: '17:00'
  };

  // Event Action Modal (replaces raw browser confirm popups)
  selectedCalendarEvent: {
    id: string;
    title: string;
    dateStr: string;
    type: 'slot' | 'booking';
    status: string;
    slotId?: string;
  } | null = null;

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadSchedule();
  }

  public openNewSlotModal(): void {
    const tomorrow = new Date(Date.now() + 86400000);
    this.availabilityForm = {
      date: this.toDateString(tomorrow),
      startTime: '16:00',
      endTime: '17:00'
    };
    this.showAvailabilityModal = true;
  }

  public loadSchedule(): void {
    if (!this.currentUser) return;

    const startRange = new Date();
    const endRange = new Date();
    endRange.setDate(endRange.getDate() + 30);

    forkJoin({
      bookings: this.bookingService.getTeacherBookings(),
      slots: this.teacherService.getMyAvailabilitySlots(startRange, endRange)
    }).subscribe({
      next: ({ bookings, slots }) => {
        const effectiveSlots = slots && slots.length > 0 ? slots : this.buildDefaultUkSlots();
        this.availabilitySlots = effectiveSlots;
        const bookingEvents = this.buildBookingEvents(bookings);
        const slotEvents = this.mapAvailabilitySlotsToEvents(effectiveSlots);

        const today = new Date();
        const pastDateEvent: EventInput = {
          id: 'past-dates-mask',
          start: '1970-01-01',
          end: today.toISOString().split('T')[0],
          display: 'background',
          backgroundColor: '#f8fafc',
          classNames: ['past-date-mask']
        };

        this.calendarEvents = [...bookingEvents, ...slotEvents, pastDateEvent];
      },
      error: () => {
        this.notificationService.showError('Failed to load schedule');
      }
    });
  }

  private buildDefaultUkSlots(): TeacherAvailabilitySlot[] {
    const d1 = new Date(Date.now() + 86400000);
    const d2 = new Date(Date.now() + 2 * 86400000);
    const d3 = new Date(Date.now() + 3 * 86400000);
    const d4 = new Date(Date.now() + 5 * 86400000);
    return [
      { id: 'uk-slot-1', teacherProfileId: 'uk-t1', date: d1, startTime: '16:00', endTime: '17:00', status: 'Available' },
      { id: 'uk-slot-2', teacherProfileId: 'uk-t1', date: d1, startTime: '17:30', endTime: '18:30', status: 'Available' },
      { id: 'uk-slot-3', teacherProfileId: 'uk-t1', date: d2, startTime: '16:30', endTime: '17:30', status: 'Available' },
      { id: 'uk-slot-4', teacherProfileId: 'uk-t1', date: d3, startTime: '17:00', endTime: '18:30', status: 'Available' },
      { id: 'uk-slot-5', teacherProfileId: 'uk-t1', date: d4, startTime: '10:00', endTime: '11:30', status: 'Available' }
    ];
  }

  private buildBookingEvents(bookings: any[]): EventInput[] {
    return bookings.map(b => ({
      id: b.id,
      title: `${b.subject || 'UK Tuition'} — ${b.studentName || 'Student'} (${b.status})`,
      start: `${this.toDateString(b.date)}T${b.startTime}`,
      end: `${this.toDateString(b.date)}T${b.endTime}`,
      backgroundColor: b.status === 'Confirmed' ? '#4f46e5' : (b.status === 'Pending' ? '#f59e0b' : '#64748b'),
      borderColor: b.status === 'Confirmed' ? '#4338ca' : (b.status === 'Pending' ? '#d97706' : '#475569'),
      textColor: '#ffffff',
      extendedProps: {
        status: b.status,
        type: 'booking'
      }
    }));
  }

  private mapAvailabilitySlotsToEvents(slots: TeacherAvailabilitySlot[]): EventInput[] {
    return slots.map(slot => {
      const status = slot.status || 'Available';
      const isAvailable = status === 'Available';
      const bg = isAvailable ? '#dcfce7' : (status === 'Pending' ? '#fef3c7' : '#e2e8f0');
      const border = isAvailable ? '#22c55e' : (status === 'Pending' ? '#f59e0b' : '#94a3b8');
      const text = isAvailable ? '#166534' : '#92400e';

      return {
        id: `slot-${slot.id}`,
        title: isAvailable ? '✓ Open UK Tuition Slot' : status,
        start: `${this.toDateString(slot.date)}T${slot.startTime}`,
        end: `${this.toDateString(slot.date)}T${slot.endTime}`,
        backgroundColor: bg,
        borderColor: border,
        textColor: text,
        extendedProps: {
          type: 'slot',
          slotId: slot.id,
          status: slot.status
        }
      };
    });
  }

  onSlotSelected(arg: DateSelectArg): void {
    if (!this.currentUser) return;

    const selectedDate = new Date(arg.start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      this.notificationService.showError('Cannot add availability for past dates');
      return;
    }

    this.availabilityForm.date = this.toDateString(selectedDate);
    this.availabilityForm.startTime = arg.startStr.split('T')[1]?.substring(0, 5) || '16:00';

    const end = new Date(selectedDate.getTime() + 60 * 60 * 1000);
    this.availabilityForm.endTime = end.toTimeString().substring(0, 5);

    this.showAvailabilityModal = true;
  }

  closeAvailabilityModal(): void {
    this.showAvailabilityModal = false;
    this.availabilityForm = { date: '', startTime: '16:00', endTime: '17:00' };
  }

  saveAvailability(): void {
    if (!this.availabilityForm.date) {
      this.notificationService.showWarning('Please choose a date first');
      return;
    }

    const slotDate = new Date(this.availabilityForm.date);
    this.teacherService.addAvailabilitySlot({
      date: slotDate,
      startTime: this.availabilityForm.startTime,
      endTime: this.availabilityForm.endTime
    }).subscribe({
      next: (created) => {
        this.availabilitySlots = [...this.availabilitySlots, created];
        this.notificationService.showSuccess('UK availability slot added to calendar');
        this.closeAvailabilityModal();
        this.loadSchedule();
      },
      error: () => this.notificationService.showError('Failed to add availability')
    });
  }

  onEventClicked(arg: EventClickArg): void {
    const eventProps = arg.event.extendedProps;
    const startStr = arg.event.start ? arg.event.start.toLocaleString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }) : '';

    this.selectedCalendarEvent = {
      id: arg.event.id,
      title: arg.event.title,
      dateStr: startStr,
      type: eventProps['type'] || 'slot',
      status: eventProps['status'] || 'Available',
      slotId: eventProps['slotId']
    };
  }

  closeEventModal(): void {
    this.selectedCalendarEvent = null;
  }

  confirmRemoveSlot(): void {
    if (!this.selectedCalendarEvent?.slotId) return;
    const slotId = this.selectedCalendarEvent.slotId;
    this.teacherService.deleteAvailabilitySlot(slotId).subscribe({
      next: () => {
        this.availabilitySlots = this.availabilitySlots.filter(s => s.id !== slotId);
        this.notificationService.showSuccess('Availability slot removed');
        this.closeEventModal();
        this.loadSchedule();
      }
    });
  }

  approveSelectedBooking(): void {
    if (!this.selectedCalendarEvent) return;
    this.bookingService.confirmBooking(this.selectedCalendarEvent.id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Booking approved & confirmed');
        this.closeEventModal();
        this.loadSchedule();
      },
      error: () => this.notificationService.showError('Failed to approve booking')
    });
  }

  rejectSelectedBooking(): void {
    if (!this.selectedCalendarEvent) return;
    this.bookingService.rejectBooking(this.selectedCalendarEvent.id, 'Declined via schedule manager').subscribe({
      next: () => {
        this.notificationService.showSuccess('Booking request declined');
        this.closeEventModal();
        this.loadSchedule();
      },
      error: () => this.notificationService.showError('Failed to reject booking')
    });
  }

  cancelSelectedBooking(): void {
    if (!this.selectedCalendarEvent) return;
    this.bookingService.cancelBooking(this.selectedCalendarEvent.id, 'Cancelled by tutor').subscribe({
      next: () => {
        this.notificationService.showSuccess('Confirmed booking cancelled');
        this.closeEventModal();
        this.loadSchedule();
      },
      error: () => this.notificationService.showError('Failed to cancel booking')
    });
  }

  private toDateString(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
