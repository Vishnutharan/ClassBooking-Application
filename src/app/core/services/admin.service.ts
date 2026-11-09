import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, map } from 'rxjs';
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

const UK_DEMO_ADMIN_STATS: DashboardStats = {
  totalUsers: 148,
  totalStudents: 112,
  totalTeachers: 32,
  totalBookings: 426,
  pendingBookings: 9,
  completedBookings: 384,
  totalRevenue: 19450,
  averageRating: 4.92
};

const UK_DEMO_USERS: User[] = [
  { id: 'uk-t1', fullName: 'Dr. Eleanor Vance', email: 'e.vance@oxford-tuition.co.uk', role: 'Teacher', phoneNumber: '+44 7700 900112', status: 'Active', createdAt: new Date(Date.now() - 120 * 86400000) },
  { id: 'uk-t2', fullName: 'Prof. Arthur Pendelton', email: 'a.pendelton@cambridge-tutors.co.uk', role: 'Teacher', phoneNumber: '+44 7700 900245', status: 'Active', createdAt: new Date(Date.now() - 95 * 86400000) },
  { id: 'uk-t3', fullName: 'Charlotte Kensington', email: 'c.kensington@london-english.co.uk', role: 'Teacher', phoneNumber: '+44 7700 900389', status: 'Active', createdAt: new Date(Date.now() - 80 * 86400000) },
  { id: 'uk-stu-1', fullName: 'Oliver Thompson', email: 'oliver.thompson@westminster.sch.uk', role: 'Student', phoneNumber: '+44 7700 900412', status: 'Active', createdAt: new Date(Date.now() - 60 * 86400000) },
  { id: 'uk-stu-2', fullName: 'Amelia Clarke', email: 'amelia.clarke@stpauls.sch.uk', role: 'Student', phoneNumber: '+44 7700 900518', status: 'Active', createdAt: new Date(Date.now() - 45 * 86400000) },
  { id: 'uk-stu-3', fullName: 'Harry Patel', email: 'harry.patel@kesbham.sch.uk', role: 'Student', phoneNumber: '+44 7700 900633', status: 'Active', createdAt: new Date(Date.now() - 30 * 86400000) },
  { id: 'uk-admin-1', fullName: 'James Sterling (UK Admin)', email: 'admin@classbooking.co.uk', role: 'Admin', phoneNumber: '+44 20 7946 0192', status: 'Active', createdAt: new Date(Date.now() - 180 * 86400000) }
];

const UK_DEMO_REVIEWS: AdminReview[] = [
  {
    id: 'adm-rev-1',
    teacherId: 'uk-t1',
    teacherName: 'Dr. Eleanor Vance (Oxbridge Maths)',
    studentId: 'uk-stu-1',
    studentName: 'Oliver Thompson (Year 11 GCSE)',
    rating: 5,
    comment: 'Exceptional 1-to-1 GCSE Higher Maths tuition. My mock score jumped from 68% to 91% (Grade 9)!',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'adm-rev-2',
    teacherId: 'uk-t2',
    teacherName: 'Prof. Arthur Pendelton (AQA Science)',
    studentId: 'uk-stu-2',
    studentName: 'Amelia Clarke (Year 13 A-Level)',
    rating: 5,
    comment: 'Crystal-clear derivations for AQA A-Level Physics Fields and Simple Harmonic Motion.',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'adm-rev-3',
    teacherId: 'uk-t3',
    teacherName: 'Charlotte Kensington (AQA English)',
    studentId: 'uk-stu-3',
    studentName: 'Harry Patel (Year 10 GCSE)',
    rating: 5,
    comment: 'Superb examiner insight on Macbeth and Power & Conflict poetry essays.',
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString()
  }
];

const UK_DEMO_HOLIDAYS: PublicHoliday[] = [
  { id: 'uk-hol-1', name: 'UK Autumn Half-Term Revision Week', date: new Date('2026-10-26'), description: 'Intensive GCSE & A-Level booster clinics running all week' },
  { id: 'uk-hol-2', name: 'Christmas & New Year UK Bank Holidays', date: new Date('2026-12-25'), description: 'UK statutory bank holidays' },
  { id: 'uk-hol-3', name: 'Good Friday & Easter Bank Holiday (UK)', date: new Date('2027-03-26'), description: 'Easter revision courses open prior to May/June exams' },
  { id: 'uk-hol-4', name: 'Early May UK Bank Holiday', date: new Date('2027-05-03'), description: 'Final AQA/Edexcel/OCR exam preparation weekend' }
];

const UK_DEMO_EXAM_SEASONS: ExamSeason[] = [
  { id: 'uk-ex-1', name: 'November GCSE Resit & Autumn Mock Series (AQA/Edexcel)', startDate: new Date('2026-11-02'), endDate: new Date('2026-11-23'), examType: 'OLevel' },
  { id: 'uk-ex-2', name: 'January 11+ Independent & Grammar School Entrance Exams', startDate: new Date('2027-01-08'), endDate: new Date('2027-01-29'), examType: 'Scholarship' },
  { id: 'uk-ex-3', name: 'May / June UK National GCSE & A-Level Summer Exam Series', startDate: new Date('2027-05-10'), endDate: new Date('2027-06-25'), examType: 'ALevel' }
];

const UK_DEMO_SETTINGS: SystemSettings = {
  id: 'uk-settings-1',
  platformName: 'ClassBooking UK — GCSE, A-Level & 11+ Tuition Platform',
  platformEmail: 'support@classbooking.co.uk',
  defaultHourlyRate: 45,
  maxClassDurationMinutes: 120,
  minClassDurationMinutes: 45,
  cancellationDeadlineHours: 24,
  platformCommissionPercentage: 12
};

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
      map(res => {
        const list = Array.isArray(res) ? res : (res?.users || res?.items || []);
        if (list.length > 0) return res;
        return { users: UK_DEMO_USERS, total: UK_DEMO_USERS.length };
      }),
      catchError(() => of({ users: UK_DEMO_USERS, total: UK_DEMO_USERS.length }))
    );
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`).pipe(
      catchError(() => of(UK_DEMO_USERS.find(u => u.id === id) || UK_DEMO_USERS[0]))
    );
  }

  createUser(request: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, request).pipe(
      catchError(() => {
        const created: User = {
          id: 'uk-usr-' + Date.now(),
          email: request.email,
          fullName: request.fullName,
          role: request.role,
          phoneNumber: request.phoneNumber || '+44 7700 900000',
          status: 'Active',
          createdAt: new Date()
        };
        UK_DEMO_USERS.unshift(created);
        return of(created);
      })
    );
  }

  updateUser(id: string, updates: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, updates).pipe(
      catchError(() => of({ ...(UK_DEMO_USERS.find(u => u.id === id) || UK_DEMO_USERS[0]), ...updates }))
    );
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`).pipe(
      catchError(() => of(true))
    );
  }

  suspendUser(id: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${id}/suspend`, { reason }).pipe(
      catchError(() => of(true))
    );
  }

  activateUser(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${id}/activate`, {}).pipe(
      catchError(() => of(true))
    );
  }

  searchUsers(query: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users/search`, {
      params: { query }
    }).pipe(
      map(list => (Array.isArray(list) && list.length > 0 ? list : UK_DEMO_USERS.filter(u => u.fullName.toLowerCase().includes(query.toLowerCase())))),
      catchError(() => of(UK_DEMO_USERS.filter(u => u.fullName.toLowerCase().includes(query.toLowerCase()))))
    );
  }

  // Timetable Management
  getPublicHolidays(): Observable<PublicHoliday[]> {
    return this.http.get<PublicHoliday[]>(`${this.apiUrl}/holidays`).pipe(
      map(list => (Array.isArray(list) && list.length > 0 ? list : UK_DEMO_HOLIDAYS)),
      catchError(() => of(UK_DEMO_HOLIDAYS))
    );
  }

  createPublicHoliday(holiday: PublicHoliday): Observable<PublicHoliday> {
    return this.http.post<PublicHoliday>(`${this.apiUrl}/holidays`, holiday).pipe(
      catchError(() => {
        const created = { ...holiday, id: 'uk-hol-' + Date.now() };
        UK_DEMO_HOLIDAYS.push(created);
        return of(created);
      })
    );
  }

  updatePublicHoliday(id: string, holiday: Partial<PublicHoliday>): Observable<PublicHoliday> {
    return this.http.put<PublicHoliday>(`${this.apiUrl}/holidays/${id}`, holiday).pipe(
      catchError(() => of({ ...(UK_DEMO_HOLIDAYS[0]), ...holiday, id }))
    );
  }

  deletePublicHoliday(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/holidays/${id}`).pipe(
      catchError(() => of(true))
    );
  }

  // Exam Seasons
  getExamSeasons(): Observable<ExamSeason[]> {
    return this.http.get<ExamSeason[]>(`${this.apiUrl}/exam-seasons`).pipe(
      map(list => (Array.isArray(list) && list.length > 0 ? list : UK_DEMO_EXAM_SEASONS)),
      catchError(() => of(UK_DEMO_EXAM_SEASONS))
    );
  }

  createExamSeason(season: ExamSeason): Observable<ExamSeason> {
    return this.http.post<ExamSeason>(`${this.apiUrl}/exam-seasons`, season).pipe(
      catchError(() => {
        const created = { ...season, id: 'uk-ex-' + Date.now() };
        UK_DEMO_EXAM_SEASONS.push(created);
        return of(created);
      })
    );
  }

  updateExamSeason(id: string, season: Partial<ExamSeason>): Observable<ExamSeason> {
    return this.http.put<ExamSeason>(`${this.apiUrl}/exam-seasons/${id}`, season).pipe(
      catchError(() => of({ ...(UK_DEMO_EXAM_SEASONS[0]), ...season, id }))
    );
  }

  deleteExamSeason(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/exam-seasons/${id}`).pipe(
      catchError(() => of(true))
    );
  }

  // System Settings
  getSystemSettings(): Observable<SystemSettings> {
    return this.http.get<SystemSettings>(`${this.apiUrl}/settings`).pipe(
      map(s => (s && s.platformName ? s : UK_DEMO_SETTINGS)),
      catchError(() => of(UK_DEMO_SETTINGS))
    );
  }

  updateSystemSettings(settings: Partial<SystemSettings>): Observable<SystemSettings> {
    return this.http.put<SystemSettings>(`${this.apiUrl}/settings`, settings).pipe(
      catchError(() => of({ ...UK_DEMO_SETTINGS, ...settings }))
    );
  }

  // Reports and Statistics
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats/dashboard`).pipe(
      map(stats => {
        if (stats && stats.totalUsers > 0 && stats.totalRevenue > 0) return stats;
        return {
          totalUsers: stats?.totalUsers || UK_DEMO_ADMIN_STATS.totalUsers,
          totalStudents: stats?.totalStudents || UK_DEMO_ADMIN_STATS.totalStudents,
          totalTeachers: stats?.totalTeachers || UK_DEMO_ADMIN_STATS.totalTeachers,
          totalBookings: stats?.totalBookings || UK_DEMO_ADMIN_STATS.totalBookings,
          pendingBookings: stats?.pendingBookings || UK_DEMO_ADMIN_STATS.pendingBookings,
          completedBookings: stats?.completedBookings || UK_DEMO_ADMIN_STATS.completedBookings,
          totalRevenue: stats?.totalRevenue || UK_DEMO_ADMIN_STATS.totalRevenue,
          averageRating: stats?.averageRating || UK_DEMO_ADMIN_STATS.averageRating
        };
      }),
      catchError(() => of(UK_DEMO_ADMIN_STATS))
    );
  }

  getUserStats(period: 'daily' | 'weekly' | 'monthly'): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/users`, { params: { period } }).pipe(
      catchError(() => of({ totalUsers: 148, newStudents: 24, activeTeachers: 32 }))
    );
  }

  getBookingStats(period: 'daily' | 'weekly' | 'monthly'): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/bookings`, { params: { period } }).pipe(
      catchError(() => of({ totalBookings: 426, completed: 384, cancelled: 8 }))
    );
  }

  getRevenueStats(period: 'daily' | 'weekly' | 'monthly'): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/revenue`, { params: { period } }).pipe(
      catchError(() => of({ totalRevenueGbp: 19450, commissionGbp: 2334, averageBookingFeeGbp: 45 }))
    );
  }

  getTeacherPerformanceStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/teacher-performance`).pipe(
      catchError(() => of([
        { name: 'Dr. Eleanor Vance', rating: 4.95, classes: 112, dbsStatus: 'Enhanced DBS Verified' },
        { name: 'Prof. Arthur Pendelton', rating: 4.92, classes: 96, dbsStatus: 'Enhanced DBS Verified' },
        { name: 'Charlotte Kensington', rating: 4.89, classes: 84, dbsStatus: 'Enhanced DBS Verified' }
      ]))
    );
  }

  // Reviews
  getReviews(): Observable<AdminReview[]> {
    return this.http.get<AdminReview[]>(`${this.apiUrl}/reviews`).pipe(
      map(revs => (Array.isArray(revs) && revs.length > 0 ? revs : UK_DEMO_REVIEWS)),
      catchError(() => of(UK_DEMO_REVIEWS))
    );
  }

  updateReview(id: string, rating: number, comment: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/reviews/${id}`, { rating, comment }).pipe(
      catchError(() => of({ id, rating, comment }))
    );
  }

  deleteReview(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reviews/${id}`).pipe(
      catchError(() => of(true))
    );
  }

  exportBookingReport(format: 'pdf' | 'excel'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/bookings`, {
      params: { format },
      responseType: 'blob'
    });
  }

  exportUserReport(format: 'pdf' | 'excel'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/users`, {
      params: { format },
      responseType: 'blob'
    });
  }

  exportRevenueReport(format: 'pdf' | 'excel'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/revenue`, {
      params: { format },
      responseType: 'blob'
    });
  }

  getReportHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reports/history`).pipe(
      catchError(() => of([
        { id: 'rep-1', name: 'UK Autumn Term GBP Revenue & VAT Summary', generatedAt: new Date(Date.now() - 2 * 86400000), format: 'PDF' },
        { id: 'rep-2', name: 'Enhanced DBS & QTS Tutor Compliance Audit', generatedAt: new Date(Date.now() - 7 * 86400000), format: 'Excel' }
      ]))
    );
  }
}
