import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { throwError, Observable, catchError, of, map } from 'rxjs';
import { ClassBooking } from '../models/shared.models';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface BookingRequest {
  teacherId: string;
  subject: string;
  date: Date;
  startTime: string;
  endTime: string;
  classType: 'Personal_1_1' | 'Group' | 'OneTime' | 'Recurring';
  mode: 'ONLINE' | 'IN_PERSON';
  bookingGradeLevel: string;
  locationOrLink?: string;
  price?: number;
  durationMinutes?: number;
  recurringDays?: string[];
  notes?: string;
  school?: string;
  parentName?: string;
  parentContact?: string;
}

export interface BookingResponse {
  success: boolean;
  message: string;
  id?: string;
  status?: string;
  booking?: ClassBooking;
}

@Injectable({
  providedIn: 'root'
})
export class ClassBookingService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/bookings`;

  getStudentBookings(): Observable<ClassBooking[]> {
    const studentId = this.authService.getCurrentUser()?.id;
    return this.http.get<ClassBooking[]>(this.apiUrl).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getTeacherBookings(): Observable<ClassBooking[]> {
    const teacherId = this.authService.getCurrentUser()?.id;
    return this.http.get<ClassBooking[]>(this.apiUrl).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getAllBookings(): Observable<ClassBooking[]> {
    return this.http.get<ClassBooking[]>(this.apiUrl).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getBookingById(id: string): Observable<ClassBooking> {
    return this.http.get<ClassBooking>(`${this.apiUrl}/${id}`);
  }

  createBooking(request: BookingRequest): Observable<BookingResponse> {
    const studentId = this.authService.getCurrentUser()?.id;
    return this.http.post<BookingResponse>(this.apiUrl, request);
  }

  updateBooking(id: string, request: Partial<BookingRequest>): Observable<BookingResponse> {
    return this.http.put<BookingResponse>(`${this.apiUrl}/${id}`, request);
  }

  cancelBooking(id: string, reason?: string): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.apiUrl}/${id}/cancel`, { reason });
  }

  confirmBooking(id: string): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.apiUrl}/${id}/confirm`, {});
  }

  completeBooking(id: string): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.apiUrl}/${id}/complete`, {});
  }

  rejectBooking(id: string, reason?: string): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.apiUrl}/${id}/reject`, { reason });
  }

  getAvailableSlots(teacherId: string, date: Date): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/slots`, {
      params: { teacherId, date: date.toISOString() }
    });
  }

  rescheduleBooking(id: string, newDate: Date, newStartTime: string, newEndTime: string): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.apiUrl}/${id}/reschedule`, {
      newDate, newStartTime, newEndTime
    });
  }
}
