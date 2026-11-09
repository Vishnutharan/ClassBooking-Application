import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { throwError, Observable, catchError, of, map } from 'rxjs';
import { StudentProfile, Resource, ExamPreparation } from '../models/shared.models';
import { environment } from '../../../environments/environment';

export interface UpdateStudentProfileRequest {
  phoneNumber?: string;
  gradeLevel?: string;
  school?: string;
  focusAreas?: string[];
  targetExams?: string[];
}

const UK_DEMO_EXAM_PREPARATIONS: ExamPreparation[] = [
  {
    id: 'uk-prep-gcse-maths',
    examType: 'OLevel',
    subject: 'Mathematics (AQA / Edexcel Higher)',
    description: 'Comprehensive GCSE Higher Tier revision packs covering Non-Calculator Paper 1, Algebra, Trigonometry, Circle Theorems & Vectors.',
    resources: [
      { id: 'r1', title: 'Edexcel GCSE Maths Higher Paper 1 (Non-Calculator) 2025 Specimen + Mark Scheme', type: 'PastPaper', url: 'https://qualifications.pearson.com', description: 'Full timed paper with worked examiner solutions' },
      { id: 'r2', title: 'AQA GCSE Mathematics Grade 8-9 Extension Workbook', type: 'PDF', url: 'https://www.aqa.org.uk', description: '85 high-tariff problem-solving questions for Grade 8 & 9 targets' },
      { id: 'r3', title: 'Circle Theorems & Algebraic Proof Masterclass', type: 'Video', url: 'https://www.bbc.co.uk/bitesize', description: '45-minute interactive walkthrough with exam tips' }
    ]
  },
  {
    id: 'uk-prep-gcse-science',
    examType: 'OLevel',
    subject: 'Physics & Chemistry (AQA Triple Science)',
    description: 'Required Practicals handbook, quantitative chemistry moles calculations, electromagnetism & forces revision notes.',
    resources: [
      { id: 'r4', title: 'AQA GCSE Physics Paper 1 & 2 Equation Sheet & Worked Examples', type: 'PDF', url: 'https://www.aqa.org.uk', description: 'Complete formula sheet with unit conversions' },
      { id: 'r5', title: 'AQA GCSE Chemistry Paper 1 Past Paper (June Series)', type: 'PastPaper', url: 'https://www.aqa.org.uk', description: 'Atomic structure, bonding, quantitative chemistry & energy changes' },
      { id: 'r6', title: 'GCSE Required Practicals Interactive Quiz', type: 'Quiz', url: 'https://www.bbc.co.uk/bitesize', description: 'Test your knowledge on variables, apparatus and risk assessments' }
    ]
  },
  {
    id: 'uk-prep-gcse-english',
    examType: 'OLevel',
    subject: 'English Literature & Language (AQA)',
    description: 'Macbeth, An Inspector Calls, Power & Conflict Poetry anthology analysis and Paper 1 Creative Reading & Writing guides.',
    resources: [
      { id: 'r7', title: 'Macbeth & An Inspector Calls Grade 9 Essay Exemplars', type: 'Notes', url: 'https://www.aqa.org.uk', description: 'Annotated top-band essays with AO1, AO2 & AO3 breakdown' },
      { id: 'r8', title: 'AQA English Language Paper 1 & 2 Past Paper Pack', type: 'PastPaper', url: 'https://www.aqa.org.uk', description: 'Includes source inserts and examiner commentary' }
    ]
  },
  {
    id: 'uk-prep-alevel-maths',
    examType: 'ALevel',
    subject: 'A-Level Mathematics & Further Maths (Edexcel)',
    description: 'Pure Mathematics Year 1 & 2 (Calculus, Differential Equations, Parametric Equations), Statistics & Mechanics exam preparation.',
    resources: [
      { id: 'r9', title: 'Edexcel A-Level Pure Mathematics Paper 1 & 2 Past Papers', type: 'PastPaper', url: 'https://qualifications.pearson.com', description: 'Full synoptic papers with step-by-step mark schemes' },
      { id: 'r10', title: 'Integration by Parts, Substitution & Differential Equations Summary', type: 'PDF', url: 'https://qualifications.pearson.com', description: 'Complete A* formula & technique crib sheet' },
      { id: 'r11', title: 'Mechanics: Projectiles, Moments & Connected Particles Video Seminar', type: 'Video', url: 'https://qualifications.pearson.com', description: 'Recorded 1-to-1 Oxbridge tutor masterclass' }
    ]
  },
  {
    id: 'uk-prep-alevel-physics',
    examType: 'ALevel',
    subject: 'A-Level Physics & Chemistry (OCR / AQA)',
    description: 'Fields, Capacitors, Nuclear Physics, Organic Synthesis pathways, Spectroscopy and Paper 3 Unified Practical Skills.',
    resources: [
      { id: 'r12', title: 'AQA A-Level Physics Paper 2 (Thermal & Fields) Past Paper', type: 'PastPaper', url: 'https://www.aqa.org.uk', description: 'Includes multiple-choice section and long-answer derivations' },
      { id: 'r13', title: 'OCR A-Level Chemistry Organic Synthesis Map & Mechanisms', type: 'PDF', url: 'https://www.ocr.org.uk', description: 'Complete aliphatic & aromatic reaction pathways' }
    ]
  },
  {
    id: 'uk-prep-11plus',
    examType: 'Scholarship',
    subject: '11+ Grammar & Independent School Entrance (GL / CEM)',
    description: 'Verbal Reasoning, Non-Verbal Reasoning, Spatial Awareness, 11+ Comprehension & Olympic Maths Challenge papers.',
    resources: [
      { id: 'r14', title: 'GL Assessment 11+ Mathematics & Verbal Reasoning Practice Paper', type: 'PastPaper', url: 'https://www.gl-assessment.co.uk', description: 'Standard 50-minute timed entrance paper with answer key' },
      { id: 'r15', title: '11+ Non-Verbal Reasoning & Spatial 3D Cubes Guide', type: 'PDF', url: 'https://www.gl-assessment.co.uk', description: 'Visual pattern recognition strategies for selective schools' }
    ]
  }
];

const UK_DEMO_PROGRESS_REPORT = {
  overallProgress: 78,
  attendanceRate: 96,
  completedClasses: 14,
  totalStudyHours: 24.5,
  subjectPerformances: [
    {
      subject: 'GCSE Mathematics (Edexcel Higher)',
      averageScore: 84,
      totalClasses: 6,
      studyHours: 9.5,
      lastClassDate: new Date(Date.now() - 2 * 86400000),
      performanceLevel: 'Excellent',
      weakAreas: ['Vector Geometry Proof', '3D Trigonometry'],
      recommendations: ['Complete 2 timed Edexcel Paper 2 Calculator past papers per week', 'Review Circle Theorem angle reasons']
    },
    {
      subject: 'A-Level Physics (AQA)',
      averageScore: 76,
      totalClasses: 5,
      studyHours: 8.0,
      lastClassDate: new Date(Date.now() - 4 * 86400000),
      performanceLevel: 'Good',
      weakAreas: ['Gravitational & Electric Fields', 'Capacitor Discharge Logarithms'],
      recommendations: ['Practice Paper 3A uncertainty & graph gradient calculations', 'Revise Lenz\'s Law and Faraday\'s Law derivations']
    },
    {
      subject: 'GCSE English Literature (AQA)',
      averageScore: 81,
      totalClasses: 3,
      studyHours: 7.0,
      lastClassDate: new Date(Date.now() - 6 * 86400000),
      performanceLevel: 'Excellent',
      weakAreas: ['Unseen Poetry Comparison Timing'],
      recommendations: ['Spend 10 minutes planning thesis statements before writing', 'Embed Jacobean context naturally in Macbeth essays']
    }
  ]
};

const UK_DEMO_STUDY_GOALS = [
  {
    id: 'goal-uk-1',
    studentId: 'demo-student',
    title: 'Complete 5 Edexcel GCSE Higher Maths Past Papers (Grade 8/9 Target)',
    description: 'Timed 90-minute papers across Non-Calculator Paper 1 and Calculator Papers 2 & 3',
    targetDate: new Date(Date.now() + 21 * 86400000),
    subject: 'Mathematics',
    goalType: 'PastPaper',
    targetValue: 5,
    currentValue: 3,
    status: 'InProgress',
    createdAt: new Date(Date.now() - 10 * 86400000),
    updatedAt: new Date()
  },
  {
    id: 'goal-uk-2',
    studentId: 'demo-student',
    title: 'Master AQA A-Level Physics Fields & Further Mechanics Unit',
    description: 'Work through all end-of-topic derivation questions and Required Practical 7 & 8 write-ups',
    targetDate: new Date(Date.now() + 14 * 86400000),
    subject: 'Physics',
    goalType: 'ChapterCompletion',
    targetValue: 100,
    currentValue: 75,
    status: 'InProgress',
    createdAt: new Date(Date.now() - 7 * 86400000),
    updatedAt: new Date()
  },
  {
    id: 'goal-uk-3',
    studentId: 'demo-student',
    title: 'Memorise 25 Key Quotations for Macbeth & An Inspector Calls',
    description: 'Flashcard active recall with writer\'s methods (AO2) and historical context (AO3)',
    targetDate: new Date(Date.now() + 30 * 86400000),
    subject: 'English Literature',
    goalType: 'StudyHours',
    targetValue: 25,
    currentValue: 25,
    status: 'Completed',
    createdAt: new Date(Date.now() - 20 * 86400000),
    updatedAt: new Date()
  }
];

const UK_DEMO_STUDENT_REVIEWS = [
  {
    id: 'rev-uk-1',
    teacherId: 'uk-t1',
    teacherName: 'Dr. Eleanor Vance (Oxbridge Maths & Physics Tutor)',
    rating: 5,
    comment: 'Brilliant 1-to-1 sessions! Dr. Vance explained Edexcel A-Level Calculus and Mechanics so clearly that my mock grade jumped from a B to an A*.',
    createdAt: new Date(Date.now() - 5 * 86400000)
  },
  {
    id: 'rev-uk-2',
    teacherId: 'uk-t2',
    teacherName: 'Prof. Arthur Pendelton (AQA English & History Examiner)',
    rating: 5,
    comment: 'Incredibly helpful feedback on my GCSE Macbeth and Power & Conflict essays. Knowing how AQA examiners mark AO2 made a huge difference.',
    createdAt: new Date(Date.now() - 12 * 86400000)
  }
];

const UK_DEMO_STUDENT_LESSON_PLANS = [
  {
    id: 'slp-uk-1',
    subject: 'Mathematics (Edexcel GCSE Higher)',
    grade: 'Year 11 (GCSE)',
    title: 'Circle Theorems, Tangents & Geometric Proof (Grade 8/9)',
    description: 'Mastering cyclic quadrilaterals, alternate segment theorem, and formal two-column geometric proofs for Paper 1 & Paper 2.',
    duration: 60,
    status: 'Planned',
    scheduledDate: new Date(Date.now() + 2 * 86400000),
    curriculumTopic: {
      unit: 'Unit 16: Circle Theorems & Vectors',
      topic: 'Alternate Segment Theorem & Tangent Proofs',
      syllabusSectionReference: 'Edexcel 1MA1 Higher Spec Ref G10'
    },
    learningObjectives: [
      { description: 'Prove and apply the Alternate Segment Theorem in multi-step exam problems', category: 'Application', achieved: true },
      { description: 'Construct rigorous algebraic and geometric proofs using exact angle terminology', category: 'Analysis', achieved: false }
    ],
    resources: [
      { title: 'Edexcel Circle Theorems Exam Questions Booklet.pdf', type: 'PDF' },
      { title: 'Interactive GeoGebra Circle Proofs Link', type: 'Interactive' }
    ],
    notes: 'Please print the 6-page diagram sheet before our session and have a compass & ruler ready.'
  },
  {
    id: 'slp-uk-2',
    subject: 'Physics (AQA A-Level)',
    grade: 'Year 12 / Year 13 (A-Level)',
    title: 'Simple Harmonic Motion, Resonance & Forced Oscillations',
    description: 'Deriving displacement, velocity and acceleration equations in SHM, analysing mass-spring and simple pendulum systems.',
    duration: 90,
    status: 'In Progress',
    scheduledDate: new Date(Date.now() + 4 * 86400000),
    curriculumTopic: {
      unit: 'Section 6.1: Periodic Motion (AQA 7408)',
      topic: 'Energy in SHM & Damping Effects',
      syllabusSectionReference: 'AQA 7408 Spec 3.6.1.2 - 3.6.1.4'
    },
    learningObjectives: [
      { description: 'Apply x = A cos(ωt) and v = ±ω√(A² - x²) to exam calculations', category: 'Application', achieved: true },
      { description: 'Sketch kinetic, potential and total energy graphs against displacement and time', category: 'Comprehension', achieved: true }
    ],
    resources: [
      { title: 'AQA SHM & Resonance Past Paper Pack (2019-2025).pdf', type: 'PDF' },
      { title: 'Required Practical 7: Simple Pendulum & G-Value Guide', type: 'Document' }
    ],
    notes: 'We will spend the final 25 minutes marking your timed section B paper together.'
  },
  {
    id: 'slp-uk-3',
    subject: 'Chemistry (OCR A-Level)',
    grade: 'Year 13 (A-Level)',
    title: 'Aromatic Chemistry, Carbonyls & NMR Spectroscopy',
    description: 'Electrophilic substitution in benzene, directing groups, Brady\'s reagent tests and interpreting proton & C-13 NMR spectra.',
    duration: 60,
    status: 'Completed',
    scheduledDate: new Date(Date.now() - 3 * 86400000),
    curriculumTopic: {
      unit: 'Module 6: Organic Chemistry & Analysis (OCR H432)',
      topic: 'Combined Spectral Analysis (IR, Mass Spec & NMR)',
      syllabusSectionReference: 'OCR H432 Module 6.3.2'
    },
    learningObjectives: [
      { description: 'Deduce unknown organic structures using splitting patterns (n+1 rule) and chemical shifts', category: 'Evaluation', achieved: true }
    ],
    resources: [
      { title: 'OCR Data Sheet & NMR Chemical Shift Table.pdf', type: 'PDF' }
    ],
    notes: 'Completed with 92% accuracy on the 12-mark spectroscopy synthesis question!'
  }
];

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
      catchError(() => of({
        id: 'uk-student-1',
        userId: 'uk-student-1',
        fullName: 'Oliver Thompson',
        email: 'oliver.thompson@westminster.sch.uk',
        phoneNumber: '+44 7700 900412',
        gradeLevel: 'ALevel',
        specificGrade: 12,
        stream: 'Science',
        school: 'Westminster City Academy, London',
        parentName: 'Charlotte Thompson',
        parentContact: '+44 7700 900410',
        focusAreas: ['Mathematics (Edexcel)', 'Physics (AQA)', 'Chemistry (OCR)'],
        targetExams: ['GCSE Higher', 'A-Level'],
        examYear: 2027,
        targetUniversity: 'Imperial College London',
        medium: 'English',
        createdAt: new Date(),
        updatedAt: new Date()
      } as StudentProfile))
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
    return this.http.get<ExamPreparation[]>(`${this.apiUrl}/exam-preparations`, { params }).pipe(
      map(list => {
        if (Array.isArray(list) && list.length > 0) return list;
        return examType
          ? UK_DEMO_EXAM_PREPARATIONS.filter(e => e.examType === examType)
          : UK_DEMO_EXAM_PREPARATIONS;
      }),
      catchError(() => of(
        examType
          ? UK_DEMO_EXAM_PREPARATIONS.filter(e => e.examType === examType)
          : UK_DEMO_EXAM_PREPARATIONS
      ))
    );
  }

  getExamPreparationById(id: string): Observable<ExamPreparation> {
    return this.http.get<ExamPreparation>(`${this.apiUrl}/exam-preparations/${id}`).pipe(
      catchError(() => of(UK_DEMO_EXAM_PREPARATIONS.find(e => e.id === id) || UK_DEMO_EXAM_PREPARATIONS[0]))
    );
  }

  getStudyMaterials(subject: string, level?: string): Observable<Resource[]> {
    let params = new HttpParams().set('subject', subject);
    if (level) {
      params = params.set('level', level);
    }
    return this.http.get<Resource[]>(`${this.apiUrl}/study-materials`, { params }).pipe(
      map(list => (Array.isArray(list) && list.length > 0 ? list : UK_DEMO_EXAM_PREPARATIONS.flatMap(e => e.resources))),
      catchError(() => of(UK_DEMO_EXAM_PREPARATIONS.flatMap(e => e.resources)))
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
      map(list => (Array.isArray(list) && list.length > 0 ? list : UK_DEMO_EXAM_PREPARATIONS.flatMap(e => e.resources).filter(r => r.type === 'PastPaper'))),
      catchError(() => of(UK_DEMO_EXAM_PREPARATIONS.flatMap(e => e.resources).filter(r => r.type === 'PastPaper')))
    );
  }

  getProgressReport(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/progress-report`).pipe(
      map(report => {
        if (report && Array.isArray(report.subjectPerformances) && report.subjectPerformances.length > 0) {
          return report;
        }
        return UK_DEMO_PROGRESS_REPORT;
      }),
      catchError(() => of(UK_DEMO_PROGRESS_REPORT))
    );
  }

  getRecommendedTeachers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/recommended-teachers`).pipe(
      catchError(() => of([]))
    );
  }

  getSummaryStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/summary-stats`).pipe(
      catchError(() => of({ totalBookings: 6, completedClasses: 4, hoursStudied: 12.5, averageRating: 4.9 }))
    );
  }

  getStudyGoals(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/study-goals`).pipe(
      map(goals => (Array.isArray(goals) && goals.length > 0 ? goals : UK_DEMO_STUDY_GOALS)),
      catchError(() => of(UK_DEMO_STUDY_GOALS))
    );
  }

  // Review methods
  getMyReviews(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-reviews`).pipe(
      map(reviews => (Array.isArray(reviews) && reviews.length > 0 ? reviews : UK_DEMO_STUDENT_REVIEWS)),
      catchError(() => of(UK_DEMO_STUDENT_REVIEWS))
    );
  }

  submitReview(review: { teacherId: string; rating: number; comment: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reviews`, review).pipe(
      catchError(() => of({
        id: 'rev-' + Date.now(),
        ...review,
        createdAt: new Date()
      }))
    );
  }

  updateReview(reviewId: string, update: { rating: number; comment: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/reviews/${reviewId}`, update).pipe(
      catchError(() => of({ id: reviewId, ...update }))
    );
  }

  deleteReview(reviewId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/reviews/${reviewId}`).pipe(
      catchError(() => of(true))
    );
  }

  // Lesson plans (student view)
  getLessonPlansForTeacher(teacherId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/lesson-plans`, {
      params: { teacherId }
    }).pipe(
      map(plans => (Array.isArray(plans) && plans.length > 0 ? plans : UK_DEMO_STUDENT_LESSON_PLANS)),
      catchError(() => of(UK_DEMO_STUDENT_LESSON_PLANS))
    );
  }
}
