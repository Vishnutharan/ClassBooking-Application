import { Component, inject, OnInit } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ClassBookingService } from '../../core/services/class-booking.service';
import { ClassBooking } from '../../core/models/shared.models';

@Component({
  selector: 'app-my-classes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-classes.component.html',
  styleUrl: './my-classes.component.css'
})
export class MyClassesComponent implements OnInit {
  private bookingService = inject(ClassBookingService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);

  allClasses: ClassBooking[] = [];
  filteredClasses: ClassBooking[] = [];
  isLoading = false;
  viewMode: 'list' | 'calendar' = 'list';
  statusFilter = 'All';
  statuses = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];
  currentUser: any;

  showNotesModal = false;
  selectedClass: ClassBooking | null = null;
  classNotes = '';
  uploadedResources: any[] = [];

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadClasses();
  }

  private loadClasses(): void {
    if (!this.currentUser) return;

    this.isLoading = true;

    const bookingsObservable = this.currentUser.role === 'Teacher'
      ? this.bookingService.getTeacherBookings()
      : this.bookingService.getStudentBookings();

    bookingsObservable.subscribe({
      next: (bookings) => {
        this.allClasses = bookings;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.notificationService.showError('Failed to load classes');
        this.isLoading = false;
      }
    });
  }

  private applyFilter(): void {
    let filtered = this.allClasses;

    if (this.statusFilter !== 'All') {
      filtered = filtered.filter(c => c.status.toLowerCase() === this.statusFilter.toLowerCase());
    }

    this.filteredClasses = filtered.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  onFilterChange(): void {
    this.applyFilter();
  }

  getStatusClass(status: string): string {
    return (status || '').toLowerCase();
  }

  startClass(booking: ClassBooking): void {
    this.notificationService.showInfo(`Launching online classroom: ${booking.subject}`);
    window.open(booking.meetingLink || 'https://meet.google.com', '_blank');
  }

  confirmBooking(booking: ClassBooking): void {
    this.bookingService.confirmBooking(booking.id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Booking confirmed & UK classroom link generated!');
        this.loadClasses();
      },
      error: () => {
        this.notificationService.showError('Failed to confirm booking');
      }
    });
  }

  markComplete(booking: ClassBooking): void {
    this.bookingService.completeBooking(booking.id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Class marked as completed');
        this.loadClasses();
      },
      error: () => {
        this.notificationService.showError('Failed to mark class as completed');
      }
    });
  }

  cancelClass(booking: ClassBooking): void {
    this.bookingService.cancelBooking(booking.id, 'Declined/Cancelled by tutor').subscribe({
      next: () => {
        this.notificationService.showSuccess('Class cancelled');
        this.loadClasses();
      },
      error: () => {
        this.notificationService.showError('Failed to cancel class');
      }
    });
  }

  openNotesModal(booking: ClassBooking): void {
    this.selectedClass = booking;
    this.classNotes = booking.notes || '';
    this.showNotesModal = true;
  }

  closeNotesModal(): void {
    this.showNotesModal = false;
    this.selectedClass = null;
  }

  saveNotes(): void {
    if (this.selectedClass) {
      const updatedBooking = { ...this.selectedClass, notes: this.classNotes };
      this.bookingService.updateBooking(this.selectedClass.id, updatedBooking).subscribe({
        next: () => {
          this.notificationService.showSuccess('Lesson notes saved successfully');
          this.closeNotesModal();
          this.loadClasses();
        },
        error: () => {
          this.notificationService.showError('Failed to save notes');
        }
      });
    }
  }
}
