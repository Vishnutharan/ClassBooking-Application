import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentIntegrationService } from '../../core/services/payment-integration.service';
import { PaymentRequestDto, PaymentRecord, PaymentMethod } from '../../core/models/payment.models';
import { ClassBookingService } from '../../core/services/class-booking.service';
import { ClassBooking } from '../../core/models/shared.models';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css'
})
export class PaymentComponent implements OnInit {
  private paymentService = inject(PaymentIntegrationService);
  private bookingService = inject(ClassBookingService);
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  booking?: ClassBooking;
  isLoading = false;
  isProcessing = false;
  paymentMethod: PaymentMethod = 'Card';
  paymentResult?: PaymentRecord;

  cardDetails = {
    cardholderName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  };

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (sessionId) {
      this.isProcessing = true;
      this.paymentService.verifyStripePayment(sessionId).subscribe({
        next: result => {
          this.isProcessing = false;
          if (result.paid) { this.notificationService.showSuccess('Payment completed successfully.'); this.router.navigate(['/my-bookings']); }
          else this.notificationService.showWarning('Payment is still processing. Refresh your bookings shortly.');
        },
        error: () => { this.isProcessing = false; this.notificationService.showError('Payment could not be verified.'); }
      });
      return;
    }
    const bookingId = this.route.snapshot.paramMap.get('bookingId');
    if (!bookingId) {
      this.notificationService.showWarning('No booking selected for payment.');
      this.router.navigate(['/my-bookings']);
      return;
    }

    this.loadBooking(bookingId);
  }

  private loadBooking(bookingId: string): void {
    this.isLoading = true;
    this.bookingService.getBookingById(bookingId).subscribe({
      next: (booking) => {
        this.booking = booking;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.notificationService.showError('Unable to load booking for payment.');
        this.router.navigate(['/my-bookings']);
      }
    });
  }

  get amount(): number {
    if (!this.booking) return 0;
    if (this.booking.price && this.booking.price > 0) return this.booking.price;
    return this.estimateAmountFromDuration();
  }

  private estimateAmountFromDuration(): number {
    if (!this.booking) return 0;
    const duration = this.booking.durationMinutes || this.calculateDuration(this.booking.startTime, this.booking.endTime);
    const rate = 2000; // fallback rate when teacher rate is not provided
    return Math.max(Math.round((duration / 60) * rate), 0);
  }

  private calculateDuration(start: string, end: string): number {
    const startDate = new Date(`2000-01-01T${start}`);
    const endDate = new Date(`2000-01-01T${end}`);
    const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
    return Math.max(Math.round(diff), 0);
  }

  submitPayment(): void {
    if (!this.booking) return;

    if (this.paymentMethod === 'Card') {
      this.isProcessing = true;
      this.paymentService.createStripeCheckout(this.booking.id).subscribe({
        next: ({ url }) => window.location.assign(url),
        error: err => { this.isProcessing = false; this.notificationService.showError(err?.error?.message || 'Unable to start secure card checkout.'); }
      });
      return;
    }

    const payload: PaymentRequestDto = {
      bookingId: this.booking.id,
      amount: this.amount,
      currency: 'GBP',
      paymentMethod: this.paymentMethod
    };

    this.isProcessing = true;
    this.paymentService.processPayment(payload).subscribe({
      next: (record) => {
        this.paymentResult = record;
        const isPaid = record.paymentStatus?.toLowerCase() === 'paid';
        const message = isPaid ? 'Payment completed successfully.' : 'Cash payment noted. Please settle with the teacher.';
        this.notificationService.showSuccess(message);
        setTimeout(() => this.router.navigate(['/my-bookings']), 1200);
      },
      error: (err) => {
        const message = err?.error?.message || 'Payment failed. Please try again.';
        this.notificationService.showError(message);
        this.isProcessing = false;
      },
      complete: () => {
        this.isProcessing = false;
      }
    });
  }

  markCash(): void {
    this.paymentMethod = 'Cash';
    this.submitPayment();
  }

  get currentUserName(): string {
    return this.authService.getCurrentUser()?.fullName || 'Student';
  }
}
