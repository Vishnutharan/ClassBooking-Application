import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { throwError, Observable, catchError, of, map } from 'rxjs';
import { User, PublicHoliday, ExamSeason, SystemSettings } from '../models/shared.models';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalRevenue: number;
  averageRating: number;
}

export interface AdminReview {
  id: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: 'Student' | 'Teacher' | 'Admin';
  phoneNumber?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin`;

  // User Management
  getAllUsers(page: number = 1, pageSize: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<any>(`${this.apiUrl}/users`, { params }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  createUser(request: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, request).pipe(
      catchError(error => throwError(() => error))
    );
  }

  updateUser(id: string, updates: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, updates).pipe(
      catchError(error => throwError(() => error))
    );
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  suspendUser(id: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${id}/suspend`, { reason }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  activateUser(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${id}/activate`, {}).pipe(
      catchError(error => throwError(() => error))
    );
  }

  searchUsers(query: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users/search`, {
      params: { query }
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // Timetable Management
  getPublicHolidays(): Observable<PublicHoliday[]> {
    return this.http.get<PublicHoliday[]>(`${this.apiUrl}/holidays`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  createPublicHoliday(holiday: PublicHoliday): Observable<PublicHoliday> {
    return this.http.post<PublicHoliday>(`${this.apiUrl}/holidays`, holiday).pipe(
      catchError(error => throwError(() => error))
    );
  }

  updatePublicHoliday(id: string, holiday: Partial<PublicHoliday>): Observable<PublicHoliday> {
    return this.http.put<PublicHoliday>(`${this.apiUrl}/holidays/${id}`, holiday).pipe(
      catchError(error => throwError(() => error))
    );
  }

  deletePublicHoliday(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/holidays/${id}`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // Exam Seasons
  getExamSeasons(): Observable<ExamSeason[]> {
    return this.http.get<ExamSeason[]>(`${this.apiUrl}/exam-seasons`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  createExamSeason(season: ExamSeason): Observable<ExamSeason> {
    return this.http.post<ExamSeason>(`${this.apiUrl}/exam-seasons`, season).pipe(
      catchError(error => throwError(() => error))
    );
  }

  updateExamSeason(id: string, season: Partial<ExamSeason>): Observable<ExamSeason> {
    return this.http.put<ExamSeason>(`${this.apiUrl}/exam-seasons/${id}`, season).pipe(
      catchError(error => throwError(() => error))
    );
  }

  deleteExamSeason(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/exam-seasons/${id}`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // System Settings
  getSystemSettings(): Observable<SystemSettings> {
    return this.http.get<SystemSettings>(`${this.apiUrl}/settings`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  updateSystemSettings(settings: Partial<SystemSettings>): Observable<SystemSettings> {
    return this.http.put<SystemSettings>(`${this.apiUrl}/settings`, settings).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // Reports and Statistics
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats/dashboard`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getUserStats(period: 'daily' | 'weekly' | 'monthly'): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/users`, { params: { period } }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getBookingStats(period: 'daily' | 'weekly' | 'monthly'): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/bookings`, { params: { period } }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getRevenueStats(period: 'daily' | 'weekly' | 'monthly'): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/revenue`, { params: { period } }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getTeacherPerformanceStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/teacher-performance`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // Reviews
  getReviews(): Observable<AdminReview[]> {
    return this.http.get<AdminReview[]>(`${this.apiUrl}/reviews`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  updateReview(id: string, rating: number, comment: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/reviews/${id}`, { rating, comment }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  deleteReview(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reviews/${id}`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  exportBookingReport(format: 'pdf' | 'excel'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/bookings`, {
      params: { format },
      responseType: 'blob'
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  exportUserReport(format: 'pdf' | 'excel'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/users`, {
      params: { format },
      responseType: 'blob'
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  exportRevenueReport(format: 'pdf' | 'excel'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/revenue`, {
      params: { format },
      responseType: 'blob'
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getReportHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reports/history`).pipe(
      catchError(error => throwError(() => error))
    );
  }
}
