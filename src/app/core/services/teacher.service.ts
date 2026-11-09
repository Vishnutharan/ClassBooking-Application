import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { throwError, Observable, catchError, of, map } from 'rxjs';
import { TeacherProfile, TeacherSubject, TeacherAvailability, TeacherAvailabilitySlot } from '../models/shared.models';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface UpdateTeacherRequest {
  bio?: string;
  hourlyRate?: number;
  qualifications?: string[];
  subjects?: TeacherSubject[];
  availability?: TeacherAvailability[];
  isAvailable?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/teacher`; // Use /teacher endpoint
  private publicApiUrl = `${environment.apiUrl}/teachers`; // Use /teachers for public APIs

  getAllTeachers(): Observable<TeacherProfile[]> {
    return this.http.get<TeacherProfile[]>(this.publicApiUrl).pipe(
      map(teachers => teachers && teachers.length > 0 ? teachers : []),
      catchError(error => throwError(() => error))
    );
  }

  getTeachersBySubject(subject: string): Observable<TeacherProfile[]> {
    return this.http.get<TeacherProfile[]>(`${this.publicApiUrl}/search`, {
      params: { subject }
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getTeachersByLevel(level: string): Observable<TeacherProfile[]> {
    return this.http.get<TeacherProfile[]>(`${this.publicApiUrl}/search`, {
      params: { level }
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getTeacherById(id: string): Observable<TeacherProfile> {
    return this.http.get<TeacherProfile>(`${this.publicApiUrl}/${id}`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // PROFILE MANAGEMENT (uses private teacher management API)
  getMyProfile(): Observable<TeacherProfile> {
    const userId = this.authService.getCurrentUser()?.id;
    return this.http.get<TeacherProfile>(`${this.apiUrl}/profile`);
  }

  updateProfile(update: UpdateTeacherRequest): Observable<TeacherProfile> {
    const userId = this.authService.getCurrentUser()?.id;
    return this.http.put<TeacherProfile>(`${this.apiUrl}/profile`, update);
  }

  addSubject(subject: TeacherSubject): Observable<TeacherProfile> {
    const teacherId = this.authService.getCurrentUser()?.id || 'teacher-1';
    return this.http.post<TeacherProfile>(`${this.apiUrl}/profile/subjects`, subject);
  }

  removeSubject(subjectId: string): Observable<TeacherProfile> {
    return this.http.delete<TeacherProfile>(`${this.apiUrl}/profile/subjects/${subjectId}`);
  }

  getMyAvailabilitySlots(startDate?: Date, endDate?: Date): Observable<TeacherAvailabilitySlot[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());

    return this.http.get<TeacherAvailabilitySlot[]>(`${this.apiUrl}/availability/slots`, { params });
  }

  addAvailabilitySlot(slot: { date: Date; startTime: string; endTime: string; }): Observable<TeacherAvailabilitySlot> {
    return this.http.post<TeacherAvailabilitySlot>(`${this.apiUrl}/availability/slots`, slot);
  }

  deleteAvailabilitySlot(slotId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/availability/slots/${slotId}`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  updateAvailability(availability: TeacherAvailability[]): Observable<TeacherProfile> {
    const teacherId = this.authService.getCurrentUser()?.id || 'teacher-1';
    return this.http.put<TeacherProfile>(`${this.apiUrl}/profile/availability`, availability);
  }

  uploadProfilePicture(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.apiUrl}/profile/picture`, formData);
  }

  // PUBLIC APIs
  searchTeachers(filters: any): Observable<TeacherProfile[]> {
    let params = new HttpParams();
    for (const key in filters) {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    }
    return this.http.get<TeacherProfile[]>(`${this.publicApiUrl}/search`, { params });
  }

  getTopRatedTeachers(limit: number = 10): Observable<TeacherProfile[]> {
    return this.http.get<TeacherProfile[]>(`${this.publicApiUrl}/top-rated`, {
      params: { limit: limit.toString() }
    });
  }

  rateTeacher(teacherId: string, rating: number, review: string): Observable<any> {
    return this.http.post(`${this.publicApiUrl}/${teacherId}/rate`, { rating, review });
  }

  getTeacherReviews(teacherId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.publicApiUrl}/${teacherId}/reviews`);
  }

  getTeacherAvailabilitySlots(teacherId: string, startDate?: Date, endDate?: Date): Observable<TeacherAvailabilitySlot[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());

    return this.http.get<TeacherAvailabilitySlot[]>(`${this.publicApiUrl}/${teacherId}/availability/slots`, { params });
  }
}
