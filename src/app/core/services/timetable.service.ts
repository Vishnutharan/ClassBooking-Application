import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { throwError, Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TimetableEvent } from '../models/shared.models';

@Injectable({
  providedIn: 'root'
})
export class TimetableService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}`;

  getTimetableForUser(from?: Date, to?: Date): Observable<TimetableEvent[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from.toISOString());
    if (to) params = params.set('to', to.toISOString());
    return this.http.get<TimetableEvent[]>(`${this.apiUrl}/timetable`, { params }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // Admin APIs
  getAllTimetable(from?: Date, to?: Date): Observable<TimetableEvent[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from.toISOString());
    if (to) params = params.set('to', to.toISOString());
    return this.http.get<TimetableEvent[]>(`${this.apiUrl}/admin/timetable`, { params }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  createEvent(evt: Partial<TimetableEvent>): Observable<TimetableEvent> {
    return this.http.post<TimetableEvent>(`${this.apiUrl}/admin/timetable`, evt).pipe(
      catchError(error => throwError(() => error))
    );
  }

  updateEvent(id: string, evt: Partial<TimetableEvent>): Observable<TimetableEvent> {
    return this.http.put<TimetableEvent>(`${this.apiUrl}/admin/timetable/${id}`, evt).pipe(
      catchError(error => throwError(() => error))
    );
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/timetable/${id}`).pipe(
      catchError(error => throwError(() => error))
    );
  }
}
