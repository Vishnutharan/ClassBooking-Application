import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { throwError, Observable, catchError, of, map, switchMap } from 'rxjs';
import { StudentProfile, Resource, ExamPreparation } from '../models/shared.models';
import { environment } from '../../../environments/environment';

export interface UpdateStudentProfileRequest {
  phoneNumber?: string;
  gradeLevel?: string;
  school?: string;
  focusAreas?: string[];
  targetExams?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/students`;

  getSummary(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/summary`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getMyProfile(): Observable<StudentProfile> {
    return this.http.get<StudentProfile>(`${this.apiUrl}/profile`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getStudentProfile(id: string): Observable<StudentProfile> {
    return this.http.get<StudentProfile>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  updateProfile(update: UpdateStudentProfileRequest): Observable<StudentProfile> {
    return this.http.put<StudentProfile>(`${this.apiUrl}/profile`, update).pipe(
      catchError(error => throwError(() => error))
    );
  }

  uploadProfilePicture(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.apiUrl}/profile/picture`, formData).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getExamPreparations(examType?: string): Observable<ExamPreparation[]> {
    let params = new HttpParams();
    if (examType) {
      params = params.set('examType', examType);
    }
    return this.http.get<ExamPreparation[]>(`${this.apiUrl}/exam-preparations`, { params });
  }

  getExamPreparationById(id: string): Observable<ExamPreparation> {
    return this.http.get<ExamPreparation>(`${this.apiUrl}/exam-preparations/${id}`);
  }

  getStudyMaterials(subject: string, level?: string): Observable<Resource[]> {
    let params = new HttpParams().set('subject', subject);
    if (level) {
      params = params.set('level', level);
    }
    return this.http.get<Resource[]>(`${this.apiUrl}/study-materials`, { params }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getPastPapers(subject: string, examType: string, year?: number): Observable<Resource[]> {
    let params = new HttpParams()
      .set('subject', subject)
      .set('examType', examType);

    if (year) {
      params = params.set('year', year.toString());
    }
    return this.http.get<Resource[]>(`${this.apiUrl}/past-papers`, { params }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getProgressReport(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/progress-report`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getRecommendedTeachers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/recommended-teachers`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getSummaryStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/summary-stats`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getStudyGoals(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/study-goals`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // Review methods
  getMyReviews(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-reviews`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  submitReview(review: { teacherId: string; rating: number; comment: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reviews`, review).pipe(
      catchError(error => throwError(() => error))
    );
  }

  updateReview(reviewId: string, update: { rating: number; comment: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/reviews/${reviewId}`, update).pipe(
      catchError(error => throwError(() => error))
    );
  }

  deleteReview(reviewId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/reviews/${reviewId}`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // Lesson plans (student view)
  getLessonPlansForTeacher(teacherId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/lesson-plans`, {
      params: { teacherId }
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }
}
