import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Resource {
  id: string;
  teacherProfileId: string;
  title: string;
  description?: string;
  type: string;
  subject: string;
  level: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType?: string;
  isPublic: boolean;
  studentId?: string;
  uploadedAt: Date;
  downloadCount: number;
}

const UK_DEMO_RESOURCES: Resource[] = [
  {
    id: 'res-uk-1',
    teacherProfileId: 'uk-t1',
    title: 'Edexcel GCSE Higher Mathematics Formulae & Grade 9 Proof Guide',
    description: 'Complete formula booklet with worked examples on vectors, circle theorems, surds and quadratic inequalities.',
    type: 'PDF',
    subject: 'Mathematics (Edexcel)',
    level: 'GCSE (Years 10-11)',
    fileName: 'Edexcel_GCSE_Maths_Higher_Guide_2026.pdf',
    filePath: '/uploads/resources/Edexcel_GCSE_Maths_Higher_Guide_2026.pdf',
    fileSize: 2458624,
    mimeType: 'application/pdf',
    isPublic: true,
    uploadedAt: new Date(Date.now() - 3 * 86400000),
    downloadCount: 48
  },
  {
    id: 'res-uk-2',
    teacherProfileId: 'uk-t1',
    title: 'AQA A-Level Physics Paper 1 & 2 Derivation Master Pack',
    description: 'Step-by-step derivations for Simple Harmonic Motion, Gravitational Fields, Capacitors and Magnetic Flux Linkage.',
    type: 'PDF',
    subject: 'Physics (AQA)',
    level: 'A-Level (Years 12-13)',
    fileName: 'AQA_ALevel_Physics_Derivations.pdf',
    filePath: '/uploads/resources/AQA_ALevel_Physics_Derivations.pdf',
    fileSize: 3812400,
    mimeType: 'application/pdf',
    isPublic: true,
    uploadedAt: new Date(Date.now() - 6 * 86400000),
    downloadCount: 62
  },
  {
    id: 'res-uk-3',
    teacherProfileId: 'uk-t2',
    title: 'AQA GCSE English Literature: Macbeth & An Inspector Calls Grade 9 Essays',
    description: 'Annotated exemplar essays showing exact AO1, AO2, and AO3 examiner marks and thesis statements.',
    type: 'Notes',
    subject: 'English Literature (AQA)',
    level: 'GCSE (Years 10-11)',
    fileName: 'AQA_GCSE_English_Lit_Exemplars.pdf',
    filePath: '/uploads/resources/AQA_GCSE_English_Lit_Exemplars.pdf',
    fileSize: 1924000,
    mimeType: 'application/pdf',
    isPublic: true,
    uploadedAt: new Date(Date.now() - 9 * 86400000),
    downloadCount: 39
  },
  {
    id: 'res-uk-4',
    teacherProfileId: 'uk-t3',
    title: 'OCR A-Level Chemistry Organic Synthesis & NMR Spectroscopy Workbook',
    description: '25 multi-step synthesis problems combining IR, Mass Spectrometry, C-13 and Proton NMR analysis.',
    type: 'PastPaper',
    subject: 'Chemistry (OCR)',
    level: 'A-Level (Years 12-13)',
    fileName: 'OCR_ALevel_Chemistry_Spectroscopy_Pack.pdf',
    filePath: '/uploads/resources/OCR_ALevel_Chemistry_Spectroscopy_Pack.pdf',
    fileSize: 4120500,
    mimeType: 'application/pdf',
    isPublic: true,
    uploadedAt: new Date(Date.now() - 12 * 86400000),
    downloadCount: 54
  },
  {
    id: 'res-uk-5',
    teacherProfileId: 'uk-t4',
    title: 'GL Assessment 11+ Verbal & Non-Verbal Reasoning Timed Mock Paper',
    description: 'Full 50-minute selective grammar & independent school entrance practice paper with parent marking key.',
    type: 'Quiz',
    subject: '11+ Entrance Prep',
    level: 'KS2 / 11+ (Years 5-6)',
    fileName: 'GL_11Plus_Mock_Paper_2026.pdf',
    filePath: '/uploads/resources/GL_11Plus_Mock_Paper_2026.pdf',
    fileSize: 1540200,
    mimeType: 'application/pdf',
    isPublic: true,
    uploadedAt: new Date(Date.now() - 15 * 86400000),
    downloadCount: 31
  }
];

@Injectable({
  providedIn: 'root'
})
export class ResourceService {
  private apiUrl = `${environment.apiUrl}/resources`;

  constructor(private http: HttpClient) { }

  uploadResource(formData: FormData): Observable<Resource> {
    return this.http.post<Resource>(`${this.apiUrl}/upload`, formData);
  }

  getTeacherResources(): Observable<Resource[]> {
    return this.http.get<Resource[]>(`${this.apiUrl}/teacher`).pipe(
      map(list => (Array.isArray(list) && list.length > 0 ? list : UK_DEMO_RESOURCES)),
      catchError(() => of(UK_DEMO_RESOURCES))
    );
  }

  getStudentResources(): Observable<Resource[]> {
    return this.http.get<Resource[]>(`${this.apiUrl}/student`).pipe(
      map(list => (Array.isArray(list) && list.length > 0 ? list : UK_DEMO_RESOURCES)),
      catchError(() => of(UK_DEMO_RESOURCES))
    );
  }

  deleteResource(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => of(undefined))
    );
  }
}
