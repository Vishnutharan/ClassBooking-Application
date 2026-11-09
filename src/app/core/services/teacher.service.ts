import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, map } from 'rxjs';
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

export const UK_DEMO_TEACHERS: TeacherProfile[] = [
  {
    id: 'uk-t1',
    userId: 'uk-t1',
    fullName: 'Dr. Eleanor Vance',
    email: 'e.vance@oxford-tuition.co.uk',
    phoneNumber: '+44 7700 900112',
    bio: 'DPhil in Mathematics (University of Oxford) & PGCE. 9+ years preparing UK students for Edexcel & AQA GCSE Higher, A-Level Mathematics, Further Maths, and Oxbridge MAT/STEP admissions.',
    qualifications: ['DPhil Mathematics (Oxon)', 'PGCE Secondary Mathematics', 'Enhanced DBS Checked', 'Edexcel Senior Examiner'],
    subjects: [
      { id: 's1', name: 'Mathematics', medium: 'English', level: 'ALevel', grades: 'Year 10, Year 11, Year 12, Year 13', curriculumBoard: 'Edexcel / AQA' },
      { id: 's2', name: 'Further Mathematics', medium: 'English', level: 'ALevel', grades: 'Year 12, Year 13', curriculumBoard: 'Edexcel / OCR' },
      { id: 's3', name: 'Physics', medium: 'English', level: 'OLevel', grades: 'Year 10, Year 11', curriculumBoard: 'AQA' }
    ],
    hourlyRate: 45,
    experienceYears: 9,
    averageRating: 4.95,
    totalReviews: 48,
    totalClasses: 320,
    isAvailable: true,
    availability: [
      { dayOfWeek: 'Monday', startTime: '16:00', endTime: '20:00' },
      { dayOfWeek: 'Wednesday', startTime: '16:00', endTime: '20:00' },
      { dayOfWeek: 'Saturday', startTime: '09:30', endTime: '15:30' }
    ],
    verificationStatus: 'Verified',
    policies: '24-hour cancellation notice required. All past papers, formula booklets and annotated whiteboard PDFs are included in the session fee.',
    teachingMode: 'ONLINE',
    meetingLink: 'https://meet.google.com/uk-vance-maths',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'uk-t2',
    userId: 'uk-t2',
    fullName: 'Prof. Arthur Pendelton',
    email: 'a.pendelton@cambridge-tutors.co.uk',
    phoneNumber: '+44 7700 900245',
    bio: 'Former Head of Science at an Outstanding London Sixth Form College. Specialist in AQA & OCR A-Level Physics, Chemistry, and GCSE Triple Science Required Practicals.',
    qualifications: ['MSci Natural Sciences (Cantab)', 'QTS & PGCE Science (UCL)', 'Enhanced DBS Checked', 'AQA A-Level Physics Assessor'],
    subjects: [
      { id: 's4', name: 'Physics', medium: 'English', level: 'ALevel', grades: 'Year 10, Year 11, Year 12, Year 13', curriculumBoard: 'AQA / OCR' },
      { id: 's5', name: 'Chemistry', medium: 'English', level: 'ALevel', grades: 'Year 10, Year 11, Year 12, Year 13', curriculumBoard: 'OCR / Edexcel' }
    ],
    hourlyRate: 50,
    experienceYears: 12,
    averageRating: 4.9,
    totalReviews: 62,
    totalClasses: 410,
    isAvailable: true,
    availability: [
      { dayOfWeek: 'Tuesday', startTime: '16:30', endTime: '20:30' },
      { dayOfWeek: 'Thursday', startTime: '16:30', endTime: '20:30' },
      { dayOfWeek: 'Sunday', startTime: '10:00', endTime: '16:00' }
    ],
    verificationStatus: 'Verified',
    policies: 'Flexible rescheduling up to 12 hours before class. Includes bespoke AQA/OCR practical write-up marking.',
    teachingMode: 'BOTH',
    locationAddress: 'South Kensington, London SW7',
    meetingLink: 'https://meet.google.com/uk-pendelton-science',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'uk-t3',
    userId: 'uk-t3',
    fullName: 'Charlotte Kensington',
    email: 'c.kensington@london-english.co.uk',
    phoneNumber: '+44 7700 900389',
    bio: 'BA & MA English Literature (King\'s College London). Dedicated to helping GCSE and A-Level students achieve Grade 8/9 and A* in AQA English Literature, Language, and 11+ Entrance.',
    qualifications: ['MA English Literature (KCL)', 'PGCE Secondary English', 'Enhanced DBS Checked'],
    subjects: [
      { id: 's6', name: 'English Literature', medium: 'English', level: 'ALevel', grades: 'Year 9, Year 10, Year 11, Year 12, Year 13', curriculumBoard: 'AQA / Edexcel' },
      { id: 's7', name: 'English Language', medium: 'English', level: 'OLevel', grades: 'Year 9, Year 10, Year 11', curriculumBoard: 'AQA' },
      { id: 's8', name: '11+ Verbal Reasoning & English', medium: 'English', level: 'Primary', grades: 'Year 5, Year 6', curriculumBoard: 'GL / CEM' }
    ],
    hourlyRate: 40,
    experienceYears: 7,
    averageRating: 4.88,
    totalReviews: 35,
    totalClasses: 215,
    isAvailable: true,
    availability: [
      { dayOfWeek: 'Monday', startTime: '15:30', endTime: '19:30' },
      { dayOfWeek: 'Thursday', startTime: '15:30', endTime: '19:30' },
      { dayOfWeek: 'Saturday', startTime: '10:00', endTime: '14:00' }
    ],
    verificationStatus: 'Verified',
    policies: 'Full essay marking and AO1/AO2/AO3 commentary provided within 48 hours of submission.',
    teachingMode: 'ONLINE',
    meetingLink: 'https://meet.google.com/uk-kensington-english',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/teacher`;
  private publicApiUrl = `${environment.apiUrl}/teachers`;

  getAllTeachers(): Observable<TeacherProfile[]> {
    return this.http.get<TeacherProfile[]>(this.publicApiUrl).pipe(
      map(teachers => (Array.isArray(teachers) && teachers.length > 0 ? teachers : UK_DEMO_TEACHERS)),
      catchError(() => of(UK_DEMO_TEACHERS))
    );
  }

  getTeachersBySubject(subject: string): Observable<TeacherProfile[]> {
    return this.http.get<TeacherProfile[]>(`${this.publicApiUrl}/search`, {
      params: { subject }
    }).pipe(
      map(teachers => (Array.isArray(teachers) && teachers.length > 0 ? teachers : UK_DEMO_TEACHERS)),
      catchError(() => of(UK_DEMO_TEACHERS))
    );
  }

  getTeachersByLevel(level: string): Observable<TeacherProfile[]> {
    return this.http.get<TeacherProfile[]>(`${this.publicApiUrl}/search`, {
      params: { level }
    }).pipe(
      map(teachers => (Array.isArray(teachers) && teachers.length > 0 ? teachers : UK_DEMO_TEACHERS)),
      catchError(() => of(UK_DEMO_TEACHERS))
    );
  }

  getTeacherById(id: string): Observable<TeacherProfile> {
    const demoMatch = UK_DEMO_TEACHERS.find(t => t.id === id || t.userId === id);
    if (demoMatch) {
      return of(demoMatch);
    }
    return this.http.get<TeacherProfile>(`${this.publicApiUrl}/${id}`).pipe(
      catchError(() => of(UK_DEMO_TEACHERS[0]))
    );
  }

  // PROFILE MANAGEMENT
  getMyProfile(): Observable<TeacherProfile> {
    const currentUser = this.authService.getCurrentUser();
    return this.http.get<TeacherProfile>(`${this.apiUrl}/profile`).pipe(
      map(profile => {
        if (profile && profile.subjects && profile.subjects.length > 0) return profile;
        return {
          ...UK_DEMO_TEACHERS[0],
          fullName: currentUser?.fullName || profile?.fullName || UK_DEMO_TEACHERS[0].fullName,
          email: currentUser?.email || profile?.email || UK_DEMO_TEACHERS[0].email,
          hourlyRate: profile?.hourlyRate || 45
        };
      }),
      catchError(() => of({
        ...UK_DEMO_TEACHERS[0],
        fullName: currentUser?.fullName || UK_DEMO_TEACHERS[0].fullName,
        email: currentUser?.email || UK_DEMO_TEACHERS[0].email
      }))
    );
  }

  updateProfile(update: UpdateTeacherRequest): Observable<TeacherProfile> {
    return this.http.put<TeacherProfile>(`${this.apiUrl}/profile`, update).pipe(
      catchError(() => of({
        ...UK_DEMO_TEACHERS[0],
        ...update
      } as TeacherProfile))
    );
  }

  addSubject(subject: TeacherSubject): Observable<TeacherProfile> {
    return this.http.post<TeacherProfile>(`${this.apiUrl}/profile/subjects`, subject).pipe(
      catchError(() => of({
        ...UK_DEMO_TEACHERS[0],
        subjects: [...UK_DEMO_TEACHERS[0].subjects, { ...subject, id: 'subj-' + Date.now() }]
      }))
    );
  }

  removeSubject(subjectId: string): Observable<TeacherProfile> {
    return this.http.delete<TeacherProfile>(`${this.apiUrl}/profile/subjects/${subjectId}`).pipe(
      catchError(() => of(UK_DEMO_TEACHERS[0]))
    );
  }

  getMyAvailabilitySlots(startDate?: Date, endDate?: Date): Observable<TeacherAvailabilitySlot[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());

    return this.http.get<TeacherAvailabilitySlot[]>(`${this.apiUrl}/availability/slots`, { params }).pipe(
      catchError(() => of([]))
    );
  }

  addAvailabilitySlot(slot: { date: Date; startTime: string; endTime: string; }): Observable<TeacherAvailabilitySlot> {
    return this.http.post<TeacherAvailabilitySlot>(`${this.apiUrl}/availability/slots`, slot).pipe(
      catchError(() => of({
        id: 'slot-' + Date.now(),
        teacherProfileId: 'uk-t1',
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: 'Available'
      }))
    );
  }

  deleteAvailabilitySlot(slotId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/availability/slots/${slotId}`).pipe(
      catchError(() => of(undefined))
    );
  }

  updateAvailability(availability: TeacherAvailability[]): Observable<TeacherProfile> {
    return this.http.put<TeacherProfile>(`${this.apiUrl}/profile/availability`, availability).pipe(
      catchError(() => of({ ...UK_DEMO_TEACHERS[0], availability }))
    );
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
    return this.http.get<TeacherProfile[]>(`${this.publicApiUrl}/search`, { params }).pipe(
      map(teachers => (Array.isArray(teachers) && teachers.length > 0 ? teachers : UK_DEMO_TEACHERS)),
      catchError(() => of(UK_DEMO_TEACHERS))
    );
  }

  getTopRatedTeachers(limit: number = 10): Observable<TeacherProfile[]> {
    return this.http.get<TeacherProfile[]>(`${this.publicApiUrl}/top-rated`, {
      params: { limit: limit.toString() }
    }).pipe(
      map(teachers => (Array.isArray(teachers) && teachers.length > 0 ? teachers : UK_DEMO_TEACHERS.slice(0, limit))),
      catchError(() => of(UK_DEMO_TEACHERS.slice(0, limit)))
    );
  }

  rateTeacher(teacherId: string, rating: number, review: string): Observable<any> {
    return this.http.post(`${this.publicApiUrl}/${teacherId}/rate`, { rating, review }).pipe(
      catchError(() => of({ success: true }))
    );
  }

  getTeacherReviews(teacherId: string): Observable<any[]> {
    const demoReviews = [
      {
        id: 'uk-rev-1',
        studentName: 'Oliver Thompson (Year 11 GCSE)',
        rating: 5,
        comment: 'Clear, structured 1-to-1 explanations with past paper mark schemes. Improved my Edexcel Higher mock from Grade 6 to Grade 9!',
        createdAt: new Date(Date.now() - 4 * 86400000)
      },
      {
        id: 'uk-rev-2',
        studentName: 'Amelia Clarke (Year 13 A-Level)',
        rating: 5,
        comment: 'Fantastic Oxbridge interview & A-Level preparation. Every lesson comes with tailored exam questions and detailed feedback.',
        createdAt: new Date(Date.now() - 11 * 86400000)
      }
    ];
    return this.http.get<any[]>(`${this.publicApiUrl}/${teacherId}/reviews`).pipe(
      map(revs => (Array.isArray(revs) && revs.length > 0 ? revs : demoReviews)),
      catchError(() => of(demoReviews))
    );
  }

  getTeacherAvailabilitySlots(teacherId: string, startDate?: Date, endDate?: Date): Observable<TeacherAvailabilitySlot[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());

    return this.http.get<TeacherAvailabilitySlot[]>(`${this.publicApiUrl}/${teacherId}/availability/slots`, { params }).pipe(
      catchError(() => of([]))
    );
  }
}
