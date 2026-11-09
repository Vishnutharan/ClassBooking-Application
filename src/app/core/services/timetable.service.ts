import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TimetableEvent } from '../models/shared.models';

const UK_DEMO_TIMETABLE_EVENTS: TimetableEvent[] = [
  {
    id: 'uk-evt-1',
    title: 'Autumn GCSE & A-Level Mock Exam Week (AQA / Edexcel / OCR)',
    description: 'Timed mock assessments across Mathematics, Triple Science, and English Literature with full examiner feedback.',
    date: new Date(Date.now() + 3 * 86400000),
    startTime: '09:00',
    endTime: '16:30',
    type: 'ExamSeason',
    audience: 'All'
  },
  {
    id: 'uk-evt-2',
    title: 'UCAS Personal Statement & Oxbridge Admissions Interview Workshop',
    description: 'Live online seminar covering PAT, MAT, TMUA preparation and personal statement review for Year 13 applicants.',
    date: new Date(Date.now() + 6 * 86400000),
    startTime: '17:30',
    endTime: '19:00',
    type: 'SpecialEvent',
    audience: 'Students'
  },
  {
    id: 'uk-evt-3',
    title: 'UK Half-Term Intensive GCSE Grade 8-9 Booster Clinic',
    description: 'Small-group and 1-to-1 intensive revision sessions focusing on high-tariff calculator and non-calculator exam questions.',
    date: new Date(Date.now() + 10 * 86400000),
    startTime: '10:00',
    endTime: '15:00',
    type: 'Class',
    audience: 'All'
  },
  {
    id: 'uk-evt-4',
    title: 'UK Bank Holiday — Platform Support & Self-Paced Revision Day',
    description: 'All digital past papers and recorded masterclasses remain open 24/7; 1-to-1 live slots by tutor arrangement.',
    date: new Date(Date.now() + 16 * 86400000),
    startTime: '00:00',
    endTime: '23:59',
    type: 'Holiday',
    audience: 'All'
  },
  {
    id: 'uk-evt-5',
    title: '11+ Grammar & Independent School Entrance Mock Saturday',
    description: 'GL & CEM Verbal Reasoning, Non-Verbal Reasoning and Comprehension practice sessions for Year 5 & Year 6 pupils.',
    date: new Date(Date.now() + 20 * 86400000),
    startTime: '09:30',
    endTime: '12:30',
    type: 'ExamSeason',
    audience: 'Students'
  }
];

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
      map(events => (Array.isArray(events) && events.length > 0 ? events : UK_DEMO_TIMETABLE_EVENTS)),
      catchError(() => of(UK_DEMO_TIMETABLE_EVENTS))
    );
  }

  // Admin APIs
  getAllTimetable(from?: Date, to?: Date): Observable<TimetableEvent[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from.toISOString());
    if (to) params = params.set('to', to.toISOString());
    return this.http.get<TimetableEvent[]>(`${this.apiUrl}/admin/timetable`, { params }).pipe(
      map(events => (Array.isArray(events) && events.length > 0 ? events : UK_DEMO_TIMETABLE_EVENTS)),
      catchError(() => of(UK_DEMO_TIMETABLE_EVENTS))
    );
  }

  createEvent(evt: Partial<TimetableEvent>): Observable<TimetableEvent> {
    return this.http.post<TimetableEvent>(`${this.apiUrl}/admin/timetable`, evt).pipe(
      catchError(() => of({
        id: 'uk-evt-' + Date.now(),
        title: evt.title || 'New UK Academic Event',
        description: evt.description || '',
        date: evt.date || new Date(),
        startTime: evt.startTime || '09:00',
        endTime: evt.endTime || '17:00',
        type: evt.type || 'SpecialEvent',
        audience: evt.audience || 'All'
      }))
    );
  }

  updateEvent(id: string, evt: Partial<TimetableEvent>): Observable<TimetableEvent> {
    return this.http.put<TimetableEvent>(`${this.apiUrl}/admin/timetable/${id}`, evt).pipe(
      catchError(() => of({
        id,
        title: evt.title || 'Updated UK Event',
        description: evt.description || '',
        date: evt.date || new Date(),
        startTime: evt.startTime,
        endTime: evt.endTime,
        type: evt.type,
        audience: evt.audience
      }))
    );
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/timetable/${id}`).pipe(
      catchError(() => of(true))
    );
  }
}
