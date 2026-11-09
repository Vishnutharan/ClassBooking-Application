import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import {
    AttendanceRecord,
    AttendanceStatus
} from '../models/teacher-attendance.models';

import {
    TeacherStudent,
    StudentProgress
} from '../models/teacher-student-management.models';

import {
    LessonPlan
} from '../models/lesson-plan.models';

import {
    TeacherMetrics,
    EarningsAnalytics,
    SubjectPerformance
} from '../models/teacher-analytics.models';

import {
    ConversationMessage,
    Conversation,
    Announcement
} from '../models/teacher-communication.models';
import { environment } from '../../../environments/environment';

const UK_DEMO_TEACHER_STUDENTS: TeacherStudent[] = [
    {
        id: 'uk-stu-1',
        userId: 'uk-stu-1',
        fullName: 'Oliver Thompson',
        email: 'oliver.thompson@westminster.sch.uk',
        phoneNumber: '+44 7700 900412',
        grade: 'Year 11 (GCSE)',
        subjects: ['Mathematics (Edexcel Higher)', 'Physics (AQA)'],
        enrollmentDate: new Date(Date.now() - 90 * 86400000),
        status: 'Active',
        performanceLevel: 'Excellent',
        school: 'Westminster City Academy, London',
        parentName: 'Charlotte Thompson',
        parentContact: '+44 7700 900410'
    },
    {
        id: 'uk-stu-2',
        userId: 'uk-stu-2',
        fullName: 'Amelia Clarke',
        email: 'amelia.clarke@stpauls.sch.uk',
        phoneNumber: '+44 7700 900518',
        grade: 'Year 13 (A-Level)',
        subjects: ['A-Level Mathematics (Edexcel)', 'Further Mathematics'],
        enrollmentDate: new Date(Date.now() - 120 * 86400000),
        status: 'Active',
        performanceLevel: 'Excellent',
        school: 'St Paul\'s Girls\' School, Hammersmith',
        parentName: 'David Clarke',
        parentContact: '+44 7700 900519'
    },
    {
        id: 'uk-stu-3',
        userId: 'uk-stu-3',
        fullName: 'Harry Patel',
        email: 'harry.patel@kesbham.sch.uk',
        phoneNumber: '+44 7700 900633',
        grade: 'Year 10 (GCSE)',
        subjects: ['Physics (AQA)', 'Chemistry (OCR)'],
        enrollmentDate: new Date(Date.now() - 60 * 86400000),
        status: 'Active',
        performanceLevel: 'Good',
        school: 'King Edward\'s School, Birmingham',
        parentName: 'Priya Patel',
        parentContact: '+44 7700 900634'
    },
    {
        id: 'uk-stu-4',
        userId: 'uk-stu-4',
        fullName: 'Isla MacLeod',
        email: 'isla.macleod@george-heriots.com',
        phoneNumber: '+44 7700 900745',
        grade: 'Year 12 (A-Level)',
        subjects: ['A-Level Physics (AQA)', 'A-Level Mathematics'],
        enrollmentDate: new Date(Date.now() - 45 * 86400000),
        status: 'Active',
        performanceLevel: 'Good',
        school: 'Manchester Grammar Sixth Form',
        parentName: 'Callum MacLeod',
        parentContact: '+44 7700 900746'
    },
    {
        id: 'uk-stu-5',
        userId: 'uk-stu-5',
        fullName: 'George Kensington',
        email: 'george.k@latymer.co.uk',
        phoneNumber: '+44 7700 900890',
        grade: 'Year 9 (KS3)',
        subjects: ['KS3 Mathematics', '13+ Scholarship Science'],
        enrollmentDate: new Date(Date.now() - 30 * 86400000),
        status: 'Active',
        performanceLevel: 'Average',
        school: 'The Latymer School, London',
        parentName: 'Victoria Kensington',
        parentContact: '+44 7700 900891'
    }
];

const UK_DEMO_ATTENDANCE: AttendanceRecord[] = [
    {
        id: 'att-uk-1',
        studentId: 'uk-stu-1',
        studentName: 'Oliver Thompson',
        classId: 'cls-uk-101',
        subject: 'GCSE Mathematics (Edexcel Higher)',
        date: new Date(),
        status: 'Present',
        notes: 'Completed full Circle Theorems proof sheet with 92% accuracy.',
        markedBy: 'uk-teacher',
        markedAt: new Date()
    },
    {
        id: 'att-uk-2',
        studentId: 'uk-stu-2',
        studentName: 'Amelia Clarke',
        classId: 'cls-uk-102',
        subject: 'A-Level Further Mathematics (Edexcel)',
        date: new Date(),
        status: 'Present',
        notes: 'Second-order differential equations & Maclaurin series exam paper.',
        markedBy: 'uk-teacher',
        markedAt: new Date()
    },
    {
        id: 'att-uk-3',
        studentId: 'uk-stu-3',
        studentName: 'Harry Patel',
        classId: 'cls-uk-103',
        subject: 'GCSE Physics (AQA Triple)',
        date: new Date(Date.now() - 86400000),
        status: 'Present',
        notes: 'Electromagnetism & Fleming\'s Left-Hand Rule past paper practice.',
        markedBy: 'uk-teacher',
        markedAt: new Date(Date.now() - 86400000)
    },
    {
        id: 'att-uk-4',
        studentId: 'uk-stu-4',
        studentName: 'Isla MacLeod',
        classId: 'cls-uk-104',
        subject: 'A-Level Physics (AQA)',
        date: new Date(Date.now() - 2 * 86400000),
        status: 'Late',
        notes: 'Joined 5 mins late due to school bus; covered SHM energy graphs.',
        markedBy: 'uk-teacher',
        markedAt: new Date(Date.now() - 2 * 86400000)
    },
    {
        id: 'att-uk-5',
        studentId: 'uk-stu-5',
        studentName: 'George Kensington',
        classId: 'cls-uk-105',
        subject: 'KS3 Mathematics',
        date: new Date(Date.now() - 3 * 86400000),
        status: 'Excused',
        notes: 'Rescheduled due to school Duke of Edinburgh expedition.',
        markedBy: 'uk-teacher',
        markedAt: new Date(Date.now() - 3 * 86400000)
    }
];

const UK_DEMO_LESSON_PLANS: LessonPlan[] = [
    {
        id: 'lp-uk-101',
        teacherId: 'uk-teacher',
        subject: 'Mathematics (Edexcel GCSE Higher)',
        grade: 'Year 11 (GCSE)',
        title: 'Vectors, Geometric Proof & Ratio Collinearity (Grade 8/9)',
        description: 'Structured 60-minute 1-to-1 lesson targeting the final 5-mark vector proof questions on Edexcel Paper 1 & Paper 3.',
        curriculumTopic: {
            id: 'ct-1',
            subject: 'Mathematics',
            grade: 'Year 11 (GCSE)',
            unit: 'Unit 18: Vectors & Geometric Proof',
            topic: 'Proving Collinearity & Parallel Vectors with Ratios',
            subtopics: ['Position vectors', 'Ratio division of a line segment', 'Equating scalar coefficients'],
            syllabusSectionReference: 'Edexcel 1MA1 Higher G25'
        },
        learningObjectives: [
            { id: 'lo-1', description: 'Express complex vector paths in terms of base vectors a and b', category: 'Comprehension', achieved: true },
            { id: 'lo-2', description: 'Prove three points lie on a straight line using scalar multiples', category: 'Analysis', achieved: true },
            { id: 'lo-3', description: 'Solve unknown scalar parameters by equating vector components', category: 'Evaluation', achieved: false }
        ],
        resources: [
            { id: 'lr-1', type: 'PDF', title: 'Edexcel Grade 9 Vector Proofs Booklet (2020-2025).pdf', uploadedAt: new Date() },
            { id: 'lr-2', type: 'Interactive', title: 'Desmos 2D Vector Ratio Visualiser', uploadedAt: new Date() }
        ],
        activities: [
            { id: 'act-1', title: 'Starter: Partitioning Line Segments in a Given Ratio', description: 'Quick-fire 10-minute warm-up on midpoint and ratio vectors.', activityType: 'Practice', duration: 15 },
            { id: 'act-2', title: 'Guided Walkthrough: June 2024 Q22 Vector Proof', description: 'Step-by-step modelling of examiner method marks (M1, M1, A1, C1).', activityType: 'Demonstration', duration: 20 },
            { id: 'act-3', title: 'Independent Timed Challenge', description: 'Student completes 3 past paper vector proofs under timed conditions.', activityType: 'Individual Work', duration: 25 }
        ],
        assessment: [
            { id: 'ass-1', type: 'Written Test', description: 'End-of-lesson 10-mark Edexcel vector question', criteria: ['Correct vector route', 'Clear factorisation', 'Concluding collinearity statement'], totalMarks: 10 }
        ],
        duration: 60,
        scheduledDate: new Date(Date.now() + 2 * 86400000),
        status: 'Planned',
        tags: ['GCSE Higher', 'Edexcel 1MA1', 'Grade 9', 'Vectors'],
        notes: 'Focus on writing the final concluding sentence clearly to secure the C1 communication mark.',
        createdAt: new Date(Date.now() - 5 * 86400000),
        updatedAt: new Date()
    },
    {
        id: 'lp-uk-102',
        teacherId: 'uk-teacher',
        subject: 'Physics (AQA A-Level)',
        grade: 'Year 13 (A-Level)',
        title: 'Gravitational & Electrostatic Fields: Potential & Escape Velocity',
        description: 'Comparing radial gravitational and electric fields, equipotential surfaces, and orbital energy derivations for AQA Paper 2.',
        curriculumTopic: {
            id: 'ct-2',
            subject: 'Physics',
            grade: 'Year 13 (A-Level)',
            unit: 'Section 7: Fields and their Consequences (AQA 7408)',
            topic: 'Gravitational Potential, Escape Velocity & Geostationary Orbits',
            subtopics: ['Newton\'s Law of Gravitation', 'Kepler\'s Third Law derivation', 'Satellite total energy'],
            syllabusSectionReference: 'AQA 7408 Spec 3.7.1 - 3.7.2'
        },
        learningObjectives: [
            { id: 'lo-4', description: 'Derive escape velocity v = √(2GM/r) from conservation of energy', category: 'Application', achieved: true },
            { id: 'lo-5', description: 'Interpret gravitational potential gradient as field strength g = -ΔV/Δr', category: 'Analysis', achieved: true }
        ],
        resources: [
            { id: 'lr-3', type: 'PDF', title: 'AQA Paper 2 Fields Multiple Choice & Long Answer Pack.pdf', uploadedAt: new Date() }
        ],
        activities: [
            { id: 'act-4', title: 'Kepler\'s Third Law & Geostationary Orbit Derivation', description: 'Equating gravitational force to centripetal force.', activityType: 'Discussion', duration: 30 },
            { id: 'act-5', title: 'Synoptic Fields Exam Question Practice', description: 'Solving 25 marks of AQA Paper 2 Section A & B questions.', activityType: 'Practice', duration: 60 }
        ],
        assessment: [
            { id: 'ass-2', type: 'Quiz', description: '15-mark AQA Paper 2 Multiple Choice Timed Drill', criteria: ['Ratio manipulation', 'Graph area interpretation'], totalMarks: 15 }
        ],
        duration: 90,
        scheduledDate: new Date(Date.now() + 4 * 86400000),
        status: 'In Progress',
        tags: ['A-Level Physics', 'AQA 7408', 'Fields', 'Paper 2'],
        notes: 'Remind student that gravitational potential V is always negative with zero at infinity.',
        createdAt: new Date(Date.now() - 8 * 86400000),
        updatedAt: new Date()
    },
    {
        id: 'lp-uk-103',
        teacherId: 'uk-teacher',
        subject: 'Mathematics (Edexcel A-Level)',
        grade: 'Year 12 (A-Level)',
        title: 'Differentiation from First Principles & Stationary Points',
        description: 'Proving derivatives of x², x³, sin(x) and cos(x) from first principles and classifying turning points using the second derivative.',
        curriculumTopic: {
            id: 'ct-3',
            subject: 'Mathematics',
            grade: 'Year 12 (A-Level)',
            unit: 'Pure Mathematics Year 1: Chapter 12 Differentiation',
            topic: 'First Principles Limits & Optimisation Problems',
            subtopics: ['Limit notation h -> 0', 'Tangents and normals', 'Maxima and minima modelling'],
            syllabusSectionReference: 'Edexcel 9MA0 Pure Spec 7.1 - 7.3'
        },
        learningObjectives: [
            { id: 'lo-6', description: 'Write out rigorous limit proofs for polynomial and trigonometric functions', category: 'Knowledge', achieved: true }
        ],
        resources: [
            { id: 'lr-4', type: 'PDF', title: 'Edexcel AS/A-Level Pure Calculus Worked Solutions.pdf', uploadedAt: new Date() }
        ],
        activities: [
            { id: 'act-6', title: 'Optimisation Modelling in 3D Cylinders & Cuboids', description: 'Formulating surface area and volume equations in exam questions.', activityType: 'Practice', duration: 60 }
        ],
        assessment: [
            { id: 'ass-3', type: 'Assignment', description: 'Homework: 4 Past Paper Optimisation Questions', criteria: ['Full limit notation', 'Second derivative test'], totalMarks: 32 }
        ],
        duration: 60,
        scheduledDate: new Date(Date.now() - 3 * 86400000),
        status: 'Completed',
        tags: ['A-Level Maths', 'Calculus', 'Edexcel 9MA0'],
        notes: 'Completed with 30/32 on the end-of-unit test.',
        createdAt: new Date(Date.now() - 14 * 86400000),
        updatedAt: new Date()
    }
];

const UK_DEMO_CONVERSATIONS: Conversation[] = [
    {
        id: 'conv-uk-1',
        participants: [
            { userId: 'uk-stu-1', name: 'Oliver Thompson (Year 11 GCSE)', role: 'Student' },
            { userId: 'uk-teacher', name: 'Tutor', role: 'Teacher' }
        ],
        subject: 'Edexcel GCSE Higher Maths — Paper 2 Calculator Revision',
        lastMessage: {
            id: 'msg-uk-102',
            senderId: 'uk-stu-1',
            senderName: 'Oliver Thompson',
            content: 'Thank you! I have completed questions 1 to 18 on the Edexcel Higher Paper 2 and uploaded my working for the vector proof.',
            sentAt: new Date(Date.now() - 1800000),
            isRead: false
        },
        unreadCount: 1,
        updatedAt: new Date(Date.now() - 1800000),
        status: 'Active'
    },
    {
        id: 'conv-uk-2',
        participants: [
            { userId: 'uk-stu-2', name: 'Amelia Clarke (Year 13 A-Level)', role: 'Student' },
            { userId: 'uk-teacher', name: 'Tutor', role: 'Teacher' }
        ],
        subject: 'Imperial College MAT & A-Level Further Maths Differential Equations',
        lastMessage: {
            id: 'msg-uk-202',
            senderId: 'uk-stu-2',
            senderName: 'Amelia Clarke',
            content: 'Could we spend the first 20 minutes of Thursday\'s session going over integrating factors and coupled first-order systems?',
            sentAt: new Date(Date.now() - 7200000),
            isRead: true
        },
        unreadCount: 0,
        updatedAt: new Date(Date.now() - 7200000),
        status: 'Active'
    },
    {
        id: 'conv-uk-3',
        participants: [
            { userId: 'uk-stu-3', name: 'Harry Patel (Year 10 GCSE)', role: 'Student' },
            { userId: 'uk-teacher', name: 'Tutor', role: 'Teacher' }
        ],
        subject: 'AQA GCSE Physics Required Practical 6 & Electromagnetism',
        lastMessage: {
            id: 'msg-uk-301',
            senderId: 'uk-stu-3',
            senderName: 'Harry Patel',
            content: 'Got 88% (Grade 9) in my school Physics topic test today! Thanks so much for the formula sheet.',
            sentAt: new Date(Date.now() - 86400000),
            isRead: true
        },
        unreadCount: 0,
        updatedAt: new Date(Date.now() - 86400000),
        status: 'Active'
    }
];

const UK_DEMO_MESSAGES_BY_CONV: Record<string, ConversationMessage[]> = {
    'conv-uk-1': [
        {
            id: 'msg-uk-101',
            senderId: 'uk-teacher',
            senderName: 'Tutor',
            content: 'Hi Oliver, I\'ve shared the Edexcel June 2024 Higher Paper 2 in your resources folder. Aim to finish it in 75 minutes before our Wednesday class.',
            sentAt: new Date(Date.now() - 7200000),
            isRead: true
        },
        {
            id: 'msg-uk-102',
            senderId: 'uk-stu-1',
            senderName: 'Oliver Thompson',
            content: 'Thank you! I have completed questions 1 to 18 on the Edexcel Higher Paper 2 and uploaded my working for the vector proof.',
            sentAt: new Date(Date.now() - 1800000),
            isRead: false
        }
    ],
    'conv-uk-2': [
        {
            id: 'msg-uk-201',
            senderId: 'uk-teacher',
            senderName: 'Tutor',
            content: 'Hi Amelia, great job on the Maclaurin series mock paper! Let me know which Further Pure topics you want to prioritise this week.',
            sentAt: new Date(Date.now() - 14400000),
            isRead: true
        },
        {
            id: 'msg-uk-202',
            senderId: 'uk-stu-2',
            senderName: 'Amelia Clarke',
            content: 'Could we spend the first 20 minutes of Thursday\'s session going over integrating factors and coupled first-order systems?',
            sentAt: new Date(Date.now() - 7200000),
            isRead: true
        }
    ],
    'conv-uk-3': [
        {
            id: 'msg-uk-301',
            senderId: 'uk-stu-3',
            senderName: 'Harry Patel',
            content: 'Got 88% (Grade 9) in my school Physics topic test today! Thanks so much for the formula sheet.',
            sentAt: new Date(Date.now() - 86400000),
            isRead: true
        }
    ]
};

const UK_DEMO_ANNOUNCEMENTS: Announcement[] = [
    {
        id: 'ann-uk-1',
        teacherId: 'uk-teacher',
        teacherName: 'Lead UK Tutor',
        title: 'Autumn GCSE & A-Level Timed Mock Papers Now Uploaded',
        content: 'All Year 11 and Year 13 students can now download the latest AQA and Edexcel specimen papers with annotated mark schemes from the Study Resources tab.',
        recipientType: 'All Students',
        recipients: [],
        attachments: [],
        isPinned: true,
        sentAt: new Date(Date.now() - 2 * 86400000),
        viewCount: 18,
        viewedBy: ['uk-stu-1', 'uk-stu-2', 'uk-stu-3']
    },
    {
        id: 'ann-uk-2',
        teacherId: 'uk-teacher',
        teacherName: 'Lead UK Tutor',
        title: 'UK Half-Term Extra 1-to-1 Revision Slots Open',
        content: 'Additional morning and afternoon slots have been added to the booking calendar for half-term week. Book early if you would like a 90-minute past paper clinic.',
        recipientType: 'All Students',
        recipients: [],
        attachments: [],
        isPinned: false,
        sentAt: new Date(Date.now() - 6 * 86400000),
        viewCount: 14,
        viewedBy: ['uk-stu-1', 'uk-stu-2']
    }
];

@Injectable({
    providedIn: 'root'
})
export class TeacherDataService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/teacher`;

    // --- ATTENDANCE DATA ---

    getAttendanceRecords(teacherId: string, startDate?: Date, endDate?: Date): Observable<AttendanceRecord[]> {
        let params = new HttpParams();
        if (startDate) params = params.set('startDate', startDate.toISOString());
        if (endDate) params = params.set('endDate', endDate.toISOString());

        return this.http.get<any[]>(`${this.apiUrl}/attendance`, { params: params.keys().length ? params : undefined }).pipe(
            map(records => {
                if (!Array.isArray(records) || records.length === 0) return UK_DEMO_ATTENDANCE;
                return records.map(r => ({
                    id: r.id || r.Id || '',
                    studentId: r.studentId || r.StudentId || '',
                    studentName: r.studentName || r.StudentName || r.studentId || '',
                    classId: r.classId || r.ClassId || '',
                    subject: r.subject || r.Subject || 'Class',
                    date: r.classDate ? new Date(r.classDate) : (r.ClassDate ? new Date(r.ClassDate) : new Date()),
                    status: (r.status || r.Status || 'Present') as AttendanceStatus,
                    notes: r.notes || r.Notes,
                    markedBy: teacherId,
                    markedAt: r.markedAt ? new Date(r.markedAt) : new Date()
                } as AttendanceRecord));
            }),
            catchError(() => of(UK_DEMO_ATTENDANCE))
        );
    }

    markAttendance(records: AttendanceRecord[]): Observable<boolean> {
        return this.http.post<boolean>(`${this.apiUrl}/attendance`, records).pipe(
            catchError(() => of(true))
        );
    }

    // --- STUDENT MANAGEMENT DATA ---

    getTeacherStudents(teacherId: string): Observable<TeacherStudent[]> {
        return this.http.get<any[]>(`${this.apiUrl}/students`).pipe(
            map(response => {
                if (!Array.isArray(response) || response.length === 0) {
                    return UK_DEMO_TEACHER_STUDENTS;
                }

                return response.map((item, idx) => ({
                    id: item.id || item.Id || item.studentId || item.StudentId || `stu-${idx}`,
                    userId: item.userId || item.UserId || item.studentId || item.StudentId || `stu-${idx}`,
                    fullName: item.fullName || item.FullName || item.studentName || item.StudentName || 'Oliver Thompson',
                    email: item.email || item.Email || 'student@ukschool.ac.uk',
                    phoneNumber: item.phoneNumber || item.PhoneNumber || '+44 7700 900412',
                    grade: item.grade || item.Grade || 'Year 11 (GCSE)',
                    subjects: (item.subjects || item.Subjects) && (item.subjects || item.Subjects).length > 0
                        ? (item.subjects || item.Subjects)
                        : (item.subject || item.Subject ? [item.subject || item.Subject] : ['Mathematics (Edexcel)', 'Physics (AQA)']),
                    enrollmentDate: item.enrolledDate ? new Date(item.enrolledDate) : (item.EnrolledDate ? new Date(item.EnrolledDate) : new Date()),
                    status: (item.isActive === false || item.IsActive === false) ? 'Inactive' : 'Active',
                    performanceLevel: item.performanceLevel || (idx % 2 === 0 ? 'Excellent' : 'Good'),
                    profilePicture: item.profilePicture || item.ProfilePicture || '',
                    school: item.school || item.School || 'Westminster City Academy, London',
                    parentName: item.parentName || item.ParentName || 'Guardian Contact (UK)',
                    parentContact: item.parentContact || item.ParentContact || '+44 7700 900410'
                } as TeacherStudent));
            }),
            catchError(() => of(UK_DEMO_TEACHER_STUDENTS))
        );
    }

    getStudentProgress(studentId: string): Observable<StudentProgress> {
        const fallbackProgress: StudentProgress = {
            studentId,
            subject: 'GCSE & A-Level Mathematics / Physics (AQA & Edexcel)',
            overallGrade: 86,
            attendanceRate: 96,
            assignmentsCompleted: 14,
            totalAssignments: 15,
            averageScore: 86,
            strengths: [
                'Algebraic Proof & Calculus Differentiation',
                'Non-Calculator Multi-Step Problem Solving',
                'Clear Method Working for Examiner Marks (M1/A1)'
            ],
            weaknesses: [
                '3D Vector Geometry Concluding Statements',
                'Logarithmic Capacitor Discharge Graphs'
            ],
            recentPerformance: [
                { date: new Date(Date.now() - 3 * 86400000), type: 'Exam', title: 'Edexcel Paper 1 Non-Calculator Timed Mock', score: 71, maxScore: 80, percentage: 89 },
                { date: new Date(Date.now() - 9 * 86400000), type: 'Assignment', title: 'AQA Fields & Simple Harmonic Motion Problem Set', score: 42, maxScore: 50, percentage: 84 },
                { date: new Date(Date.now() - 16 * 86400000), type: 'Quiz', title: 'Circle Theorems & Algebraic Fractions Drill', score: 26, maxScore: 30, percentage: 87 }
            ],
            lastUpdated: new Date()
        };

        return this.http.get<StudentProgress>(`${this.apiUrl}/students/${studentId}/progress`).pipe(
            map(progress => (progress && progress.recentPerformance && progress.recentPerformance.length > 0 ? progress : fallbackProgress)),
            catchError(() => of(fallbackProgress))
        );
    }

    // --- LESSON PLANNING DATA ---

    getLessonPlans(teacherId: string): Observable<LessonPlan[]> {
        return this.http.get<LessonPlan[]>(`${this.apiUrl}/lesson-plans`).pipe(
            map(plans => (Array.isArray(plans) && plans.length > 0 ? plans : UK_DEMO_LESSON_PLANS)),
            catchError(() => of(UK_DEMO_LESSON_PLANS))
        );
    }

    saveLessonPlan(plan: LessonPlan): Observable<LessonPlan> {
        if (plan.id && !plan.id.startsWith('lp-temp') && !plan.id.startsWith('lp-uk-')) {
            return this.http.put<LessonPlan>(`${this.apiUrl}/lesson-plans/${plan.id}`, plan).pipe(
                catchError(() => of({ ...plan, updatedAt: new Date() }))
            );
        } else {
            return this.http.post<LessonPlan>(`${this.apiUrl}/lesson-plans`, plan).pipe(
                catchError(() => of({ ...plan, id: 'lp-uk-' + Date.now(), createdAt: new Date(), updatedAt: new Date() }))
            );
        }
    }

    deleteLessonPlan(planId: string): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/lesson-plans/${planId}`).pipe(
            catchError(() => of(true))
        );
    }

    // --- ANALYTICS DATA ---

    getTeacherAnalytics(teacherId: string, period: 'daily' | 'weekly' | 'monthly' | 'yearly'): Observable<TeacherMetrics> {
        const fallbackMetrics: TeacherMetrics = {
            teacherId,
            period,
            startDate: new Date(Date.now() - 30 * 86400000),
            endDate: new Date(),
            totalStudents: 18,
            activeStudents: 16,
            newStudents: 4,
            studentRetentionRate: 94,
            totalClasses: 42,
            completedClasses: 39,
            cancelledClasses: 1,
            averageClassSize: 1.2,
            averageRating: 4.9,
            totalReviews: 28,
            ratingsBreakdown: {
                fiveStars: 25,
                fourStars: 3,
                threeStars: 0,
                twoStars: 0,
                oneStar: 0
            },
            averageAttendance: 96,
            studentEngagementScore: 92,
            lastUpdated: new Date()
        };

        return this.http.get<TeacherMetrics>(`${this.apiUrl}/analytics`, {
            params: { period }
        }).pipe(
            map(m => (m && m.totalClasses > 0 ? m : fallbackMetrics)),
            catchError(() => of(fallbackMetrics))
        );
    }

    getEarningsAnalytics(teacherId: string, period: 'monthly' | 'yearly'): Observable<EarningsAnalytics> {
        const fallbackEarnings: EarningsAnalytics = {
            teacherId,
            period,
            totalEarnings: period === 'yearly' ? 24680 : 2340,
            projectedEarnings: period === 'yearly' ? 28500 : 2790,
            averageHourlyRate: 45,
            totalHoursTeaching: period === 'yearly' ? 548 : 52,
            earningsBySubject: [
                { subject: 'A-Level Mathematics (Edexcel)', earnings: 990, classCount: 20, averageRate: 49.5, percentage: 42 },
                { subject: 'GCSE Mathematics Higher (AQA/Edexcel)', earnings: 765, classCount: 18, averageRate: 42.5, percentage: 33 },
                { subject: 'A-Level Physics (AQA)', earnings: 585, classCount: 12, averageRate: 48.75, percentage: 25 }
            ],
            earningsByClassType: [
                { classType: 'Individual', earnings: 1890, classCount: 40, percentage: 81 },
                { classType: 'Online', earnings: 450, classCount: 10, percentage: 19 }
            ],
            earningsTrend: [
                { date: new Date(Date.now() - 25 * 86400000), earnings: 520, classCount: 11, studentCount: 8 },
                { date: new Date(Date.now() - 18 * 86400000), earnings: 585, classCount: 13, studentCount: 10 },
                { date: new Date(Date.now() - 11 * 86400000), earnings: 610, classCount: 14, studentCount: 11 },
                { date: new Date(Date.now() - 4 * 86400000), earnings: 625, classCount: 14, studentCount: 12 }
            ],
            peakEarningHours: [
                { hour: 16, dayOfWeek: 'Tuesday', classCount: 8, earnings: 360 },
                { hour: 17, dayOfWeek: 'Wednesday', classCount: 10, earnings: 450 },
                { hour: 18, dayOfWeek: 'Thursday', classCount: 9, earnings: 405 },
                { hour: 10, dayOfWeek: 'Saturday', classCount: 12, earnings: 540 }
            ]
        };

        return this.http.get<EarningsAnalytics>(`${this.apiUrl}/analytics/earnings`, {
            params: { period }
        }).pipe(
            map(e => (e && e.totalEarnings > 0 ? e : fallbackEarnings)),
            catchError(() => of(fallbackEarnings))
        );
    }

    getSubjectPerformance(teacherId: string): Observable<SubjectPerformance[]> {
        const fallbackSubjects: SubjectPerformance[] = [
            {
                subject: 'A-Level Mathematics (Edexcel 9MA0)',
                totalStudents: 7,
                averageScore: 86,
                passRate: 100,
                improvementRate: 24,
                studentSatisfaction: 4.95,
                classesCompleted: 20,
                topPerformers: ['Amelia Clarke (A* Track)', 'Isla MacLeod (A Track)'],
                needsAttention: ['Parametric Integration timing']
            },
            {
                subject: 'GCSE Mathematics Higher (Edexcel / AQA)',
                totalStudents: 6,
                averageScore: 83,
                passRate: 100,
                improvementRate: 28,
                studentSatisfaction: 4.9,
                classesCompleted: 18,
                topPerformers: ['Oliver Thompson (Grade 9 Track)'],
                needsAttention: ['George Kensington — Vector proof notation']
            },
            {
                subject: 'A-Level & GCSE Physics (AQA)',
                totalStudents: 5,
                averageScore: 81,
                passRate: 100,
                improvementRate: 21,
                studentSatisfaction: 4.88,
                classesCompleted: 12,
                topPerformers: ['Harry Patel (Grade 9)', 'Oliver Thompson (Grade 8)'],
                needsAttention: ['Required Practical uncertainty graphs']
            }
        ];

        return this.http.get<SubjectPerformance[]>(`${this.apiUrl}/analytics/subjects`).pipe(
            map(s => (Array.isArray(s) && s.length > 0 ? s : fallbackSubjects)),
            catchError(() => of(fallbackSubjects))
        );
    }

    // --- COMMUNICATION DATA ---

    getConversations(teacherId: string): Observable<Conversation[]> {
        return this.http.get<Conversation[]>(`${this.apiUrl}/communication/conversations`).pipe(
            map(convs => (Array.isArray(convs) && convs.length > 0 ? convs : UK_DEMO_CONVERSATIONS)),
            catchError(() => of(UK_DEMO_CONVERSATIONS))
        );
    }

    getAnnouncements(teacherId: string): Observable<Announcement[]> {
        return this.http.get<Announcement[]>(`${this.apiUrl}/communication/announcements`).pipe(
            map(anns => (Array.isArray(anns) && anns.length > 0 ? anns : UK_DEMO_ANNOUNCEMENTS)),
            catchError(() => of(UK_DEMO_ANNOUNCEMENTS))
        );
    }

    sendMessage(conversationId: string, content: string): Observable<ConversationMessage> {
        return this.http.post<ConversationMessage>(`${this.apiUrl}/communication/messages`, { conversationId, content }).pipe(
            catchError(() => {
                const msg: ConversationMessage = {
                    id: 'msg-' + Date.now(),
                    senderId: 'uk-teacher',
                    senderName: 'You (UK Tutor)',
                    content,
                    sentAt: new Date(),
                    isRead: true
                };
                if (UK_DEMO_MESSAGES_BY_CONV[conversationId]) {
                    UK_DEMO_MESSAGES_BY_CONV[conversationId].push(msg);
                }
                return of(msg);
            })
        );
    }

    getMessages(conversationId: string): Observable<ConversationMessage[]> {
        return this.http.get<ConversationMessage[]>(`${this.apiUrl}/communication/conversations/${encodeURIComponent(conversationId)}/messages`).pipe(
            map(msgs => (Array.isArray(msgs) && msgs.length > 0 ? msgs : (UK_DEMO_MESSAGES_BY_CONV[conversationId] || UK_DEMO_MESSAGES_BY_CONV['conv-uk-1']))),
            catchError(() => of(UK_DEMO_MESSAGES_BY_CONV[conversationId] || UK_DEMO_MESSAGES_BY_CONV['conv-uk-1']))
        );
    }

    markConversationRead(conversationId: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/communication/conversations/${encodeURIComponent(conversationId)}/read`, {}).pipe(
            catchError(() => of(undefined))
        );
    }

    createAnnouncement(announcement: Announcement): Observable<Announcement> {
        return this.http.post<Announcement>(`${this.apiUrl}/communication/announcements`, announcement).pipe(
            catchError(() => {
                const created: Announcement = {
                    ...announcement,
                    id: 'ann-uk-' + Date.now(),
                    sentAt: new Date(),
                    viewCount: 1
                };
                UK_DEMO_ANNOUNCEMENTS.unshift(created);
                return of(created);
            })
        );
    }
}
