import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { throwError, Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaymentRequestDto, PaymentRecord } from '../models/payment.models';

@Injectable({
  providedIn: 'root'
})
export class PaymentIntegrationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/payments`;

  createStripeCheckout(bookingId: string): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.apiUrl}/stripe/checkout`, { bookingId });
  }

  verifyStripePayment(sessionId: string): Observable<{ paid: boolean }> {
    return this.http.post<{ paid: boolean }>(`${this.apiUrl}/stripe/verify/${encodeURIComponent(sessionId)}`, {});
  }

  processPayment(request: PaymentRequestDto): Observable<PaymentRecord> {
    return this.http.post<PaymentRecord>(this.apiUrl, request);
  }

  getStudentPayments(): Observable<PaymentRecord[]> {
    return this.http.get<PaymentRecord[]>(`${this.apiUrl}/student`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getTeacherPayments(): Observable<PaymentRecord[]> {
    return this.http.get<PaymentRecord[]>(`${this.apiUrl}/teacher`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getAdminPayments(): Observable<PaymentRecord[]> {
    return this.http.get<PaymentRecord[]>(`${this.apiUrl}/admin`).pipe(
      catchError(error => throwError(() => error))
    );
  }
}
