import { Injectable } from '@angular/core';
import { of, Observable } from 'rxjs';
import {
  User,
  TeacherProfile,
  TeacherAvailability,
  TeacherSubject,
  ClassBooking,
  StudentProfile,
  Resource,
  ExamPreparation,
  PublicHoliday,
  ExamSeason,
  SystemSettings
} from '../models/shared.models';
import { AuthResponse } from '../models/auth.models';
import { DashboardStats } from './admin.service';

interface MockCredential {
  email: string;
  password: string;
  userId: string;
}

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private users: User[] = [];
  private teachers: TeacherProfile[] = [];
  private students: StudentProfile[] = [];
  private bookings: ClassBooking[] = [];
  private resources: Resource[] = [];
  private examPreparations: ExamPreparation[] = [];
  private holidays: PublicHoliday[] = [];
  private examSeasons: ExamSeason[] = [];
  private systemSettings: SystemSettings = {
    id: '',
    platformName: '',
    platformEmail: '',
    defaultHourlyRate: 0,
    maxClassDurationMinutes: 0,
    minClassDurationMinutes: 0,
    cancellationDeadlineHours: 0,
    platformCommissionPercentage: 0
  };
  private credentials: MockCredential[] = [];

  constructor() {
    this.seedData();
  }

  // Authentication --------------------------------------------------
  login(email: string, password: string): Observable<AuthResponse> {
    const credential = this.credentials.find(
      c => c.email.toLowerCase() === email.toLowerCase()
    );

    if (!credential || credential.password !== password) {
      throw new Error('Invalid mock credentials');
    }

    const user = this.users.find(u => u.id === credential.userId);
    if (!user) {
      throw new Error('Mock user not found');
    }

    return of(this.buildAuthResponse(user));
  }

  register(fullName: string, email: string, password: string, role: User['role']): Observable<AuthResponse> {
    const newUser: User = {
      id: this.generateId('user'),
      email,
      fullName,
      role,
      status: 'Active',
      createdAt: new Date(),
      lastLogin: new Date()
    };

    this.users.push(newUser);
    this.credentials.push({ email, password, userId: newUser.id });

    if (role === 'Teacher') {
      this.teachers.push(this.buildTeacherProfile(newUser, [], [], 1200));
    } else if (role === 'Student') {
      this.students.push(this.buildStudentProfile(newUser));
    }

    return of(this.buildAuthResponse(newUser));
  }

  // Users -----------------------------------------------------------
  getAllUsers(page: number, pageSize: number): Observable<{ users: User[]; total: number }> {
    const start = (page - 1) * pageSize;
    const pagedUsers = this.users.slice(start, start + pageSize);
    return of({ users: pagedUsers, total: this.users.length });
  }

  createUser(user: Partial<User>): Observable<User> {
    const newUser: User = {
      id: this.generateId('user'),
      email: user.email || 'unknown@classbooking.com',
      fullName: user.fullName || 'New User',
      role: user.role || 'Student',
      phoneNumber: user.phoneNumber,
      status: 'Active',
      createdAt: new Date(),
      lastLogin: new Date()
    };

    this.users.push(newUser);
    if (user.password) {
      this.credentials.push({
        email: newUser.email,
        password: user.password,
        userId: newUser.id
      });
    }
    return of(newUser);
  }

  updateUser(id: string, updates: Partial<User>): Observable<User> {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) {
      throw new Error('User not found');
    }
    this.users[idx] = { ...this.users[idx], ...updates };
    return of(this.users[idx]);
  }

  suspendUser(id: string): Observable<boolean> {
    const user = this.users.find(u => u.id === id);
    if (user) {
      user.status = 'Suspended';
    }
    return of(true);
  }

  activateUser(id: string): Observable<boolean> {
    const user = this.users.find(u => u.id === id);
    if (user) {
      user.status = 'Active';
    }
    return of(true);
  }

  // Teachers --------------------------------------------------------
  getAllTeachers(): Observable<TeacherProfile[]> {
    return of([...this.teachers]);
  }

  getTeacherById(id: string): Observable<TeacherProfile> {
    const teacher = this.teachers.find(t => t.id === id) || this.teachers[0];
    return of(teacher);
  }

  getTeacherProfileForUser(userId?: string): Observable<TeacherProfile> {
    const teacher = this.teachers.find(t => t.userId === userId) || this.teachers[0];
    return of(teacher);
  }

  updateTeacherProfile(update: Partial<TeacherProfile>): Observable<TeacherProfile> {
    const idx = this.teachers.findIndex(t => t.id === update.id || t.userId === update.userId);
    if (idx !== -1) {
      this.teachers[idx] = { ...this.teachers[idx], ...update };
      return of(this.teachers[idx]);
    }
    return of(this.teachers[0]);
  }

  addTeacherSubject(teacherId: string, subject: TeacherSubject): Observable<TeacherProfile> {
    const teacher = this.teachers.find(t => t.id === teacherId);
    if (teacher) {
      teacher.subjects = [...teacher.subjects, subject];
    }
    return of(teacher || this.teachers[0]);
  }

  updateTeacherAvailability(teacherId: string, availability: TeacherAvailability[]): Observable<TeacherProfile> {
    const teacher = this.teachers.find(t => t.id === teacherId);
    if (teacher) {
      teacher.availability = availability;
    }
    return of(teacher || this.teachers[0]);
  }

  getTeacherReviews(): Observable<any[]> {
    return of([
      { student: 'Nimali Fernando', rating: 5, comment: 'Great explanations', date: new Date() },
      { student: 'Ruwan Jayasinghe', rating: 4, comment: 'Very helpful sessions', date: new Date() }
    ]);
  }

  // Students --------------------------------------------------------
  getStudentSummary(): Observable<any> {
    const completed = this.bookings.filter(b => b.status === 'Completed').length;
    const confirmed = this.bookings.filter(b => b.status === 'Confirmed').length;
    return of({
      totalClasses: this.bookings.length,
      completedClasses: completed,
      studyHours: completed * 2,
      progressPercentage: 68,
      averageRating: 4.6,
      upcoming: confirmed
    });
  }

  getStudentProgress(): Observable<any> {
    return of({
      activities: [
        { message: 'Completed Algebra practice', timestamp: new Date() },
        { message: 'New booking confirmed with Mr. Silva', timestamp: new Date() }
      ],
      subjectsProgress: [
        { subject: 'Mathematics', progress: 72 },
        { subject: 'Science', progress: 64 },
        { subject: 'English', progress: 58 }
      ]
    });
  }

  getRecommendedTeachers(): Observable<TeacherProfile[]> {
    return of(this.teachers.slice(0, 3));
  }

  getStudentProfile(id?: string): Observable<StudentProfile> {
    const profile = this.students.find(s => s.userId === id || s.id === id) || this.students[0];
    return of(profile);
  }

  getStudyGoals(): Observable<any[]> {
    return of([
      { title: 'Finish Algebra chapter', progress: 80, dueDate: new Date() },
      { title: '5 hours of revision', progress: 40, dueDate: new Date() }
    ]);
  }

  getExamPreparations(examType?: string): Observable<ExamPreparation[]> {
    if (!examType) return of(this.examPreparations);
    return of(this.examPreparations.filter(e => e.examType === examType));
  }

  getStudyMaterials(subject: string): Observable<Resource[]> {
    return of(this.resources.filter(r => r.title.toLowerCase().includes(subject.toLowerCase())));
  }

  getPastPapers(subject: string, examType: string): Observable<Resource[]> {
    return of(
      this.resources.filter(
        r => r.title.toLowerCase().includes(subject.toLowerCase()) && r.type === 'PastPaper'
      )
    );
  }

  getReviews(): Observable<any[]> {
    return of([
      { id: 'rv1', teacherId: 'teacher-1', rating: 5, comment: 'Excellent', createdAt: new Date() },
      { id: 'rv2', teacherId: 'teacher-2', rating: 4, comment: 'Very good', createdAt: new Date() }
    ]);
  }

  // Bookings --------------------------------------------------------
  getBookings(): Observable<ClassBooking[]> {
    return of([...this.bookings]);
  }

  getBookingsForStudent(studentId?: string): Observable<ClassBooking[]> {
    if (!studentId) return this.getBookings();
    return of(this.bookings.filter(b => b.studentId === studentId));
  }

  getBookingsForTeacher(teacherId?: string): Observable<ClassBooking[]> {
    if (!teacherId) return this.getBookings();
    return of(this.bookings.filter(b => b.teacherId === teacherId));
  }

  addBooking(request: Partial<ClassBooking>): Observable<{ success: boolean; message: string; booking: ClassBooking }> {
    const newBooking: ClassBooking = {
      id: this.generateId('booking'),
      studentId: request.studentId || 'student-1',
      teacherId: request.teacherId || this.teachers[0].id,
      subject: request.subject || 'General',
      date: request.date ? new Date(request.date) : new Date(),
      startTime: request.startTime || '09:00',
      endTime: request.endTime || '10:00',
      status: 'Pending',
      classType: request.classType || 'OneTime',
      mode: request.mode || 'ONLINE',
      locationOrLink: request.locationOrLink || 'https://meet.google.com/mock',
      bookingGradeLevel: request.bookingGradeLevel || 'O-Level',
      price: request.price || 1500,
      durationMinutes: request.durationMinutes || 60,
      notes: request.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.bookings.push(newBooking);
    return of({ success: true, message: 'Booking created (mock)', booking: newBooking });
  }

  updateBookingStatus(id: string, status: ClassBooking['status']): Observable<{ success: boolean; message: string; booking?: ClassBooking }> {
    const booking = this.bookings.find(b => b.id === id);
    if (booking) {
      booking.status = status;
      booking.updatedAt = new Date();
    }
    return of({ success: true, message: `Booking ${status.toLowerCase()} (mock)`, booking });
  }

  rescheduleBooking(id: string, date: Date, start: string, end: string): Observable<{ success: boolean; message: string; booking?: ClassBooking }> {
    const booking = this.bookings.find(b => b.id === id);
    if (booking) {
      booking.date = new Date(date);
      booking.startTime = start;
      booking.endTime = end;
      booking.status = 'Pending';
      booking.updatedAt = new Date();
    }
    return of({ success: true, message: 'Booking rescheduled (mock)', booking });
  }

  getAvailableSlots(): Observable<string[]> {
    return of(['09:00', '10:00', '11:00', '14:00', '15:00']);
  }

  // Admin data ------------------------------------------------------
  getDashboardStats(): Observable<DashboardStats> {
    const totalStudents = this.users.filter(u => u.role === 'Student').length;
    const totalTeachers = this.users.filter(u => u.role === 'Teacher').length;
    const completedBookings = this.bookings.filter(b => b.status === 'Completed').length;
    const pendingBookings = this.bookings.filter(b => b.status === 'Pending').length;

    return of({
      totalUsers: this.users.length,
      totalStudents,
      totalTeachers,
      totalBookings: this.bookings.length,
      pendingBookings,
      completedBookings,
      totalRevenue: completedBookings * 1500,
      averageRating: 4.7
    });
  }

  getBookingStats(): Observable<any> {
    const confirmed = this.bookings.filter(b => b.status === 'Confirmed').length;
    const completed = this.bookings.filter(b => b.status === 'Completed').length;
    const pending = this.bookings.filter(b => b.status === 'Pending').length;
    const cancelled = this.bookings.filter(b => b.status === 'Cancelled').length;
    return of({
      total: this.bookings.length,
      confirmed,
      completed,
      pending,
      cancelled
    });
  }

  getUserStats(): Observable<any> {
    const students = this.users.filter(u => u.role === 'Student').length;
    const teachers = this.users.filter(u => u.role === 'Teacher').length;
    const admins = this.users.filter(u => u.role === 'Admin').length;
    return of({
      totalUsers: this.users.length,
      newThisMonth: 4,
      students,
      teachers,
      admins,
      byRole: [
        { role: 'Students', count: students },
        { role: 'Teachers', count: teachers },
        { role: 'Admins', count: admins }
      ]
    });
  }

  getRevenueStats(): Observable<any> {
    return of({
      totalRevenue: 185000,
      monthlyRevenue: [
        { month: 'Jan', revenue: 24000 },
        { month: 'Feb', revenue: 26000 },
        { month: 'Mar', revenue: 32000 },
        { month: 'Apr', revenue: 28000 },
        { month: 'May', revenue: 35000 },
        { month: 'Jun', revenue: 45000 }
      ],
      byTeacher: this.teachers.map(t => ({
        teacher: t.fullName,
        revenue: Math.round(t.totalClasses * 1200)
      })),
      commission: 0.15
    });
  }

  getTeacherPerformanceStats(): Observable<any> {
    return of({
      topTeachers: this.teachers.slice(0, 3).map(t => ({
        name: t.fullName,
        rating: t.averageRating,
        classes: t.totalClasses
      })),
      averageRating: 4.7,
      completionRate: 92,
      earningsLeaderboard: this.teachers.map(t => ({
        teacher: t.fullName,
        earnings: t.totalClasses * 1200
      }))
    });
  }

  exportReport(): Observable<Blob> {
    return of(new Blob(['mock report'], { type: 'text/plain' }));
  }

  getSystemSettings(): Observable<SystemSettings> {
    return of(this.systemSettings);
  }

  updateSystemSettings(update: Partial<SystemSettings>): Observable<SystemSettings> {
    this.systemSettings = { ...this.systemSettings, ...update };
    return of(this.systemSettings);
  }

  getPublicHolidays(): Observable<PublicHoliday[]> {
    return of([...this.holidays]);
  }

  createPublicHoliday(holiday: PublicHoliday): Observable<PublicHoliday> {
    const newHoliday = { ...holiday, id: this.generateId('holiday') };
    this.holidays.push(newHoliday);
    return of(newHoliday);
  }

  updatePublicHoliday(id: string, holiday: Partial<PublicHoliday>): Observable<PublicHoliday> {
    const idx = this.holidays.findIndex(h => h.id === id);
    if (idx !== -1) {
      this.holidays[idx] = { ...this.holidays[idx], ...holiday };
    }
    return of(this.holidays[idx]);
  }

  deletePublicHoliday(id: string): Observable<boolean> {
    this.holidays = this.holidays.filter(h => h.id !== id);
    return of(true);
  }

  getExamSeasons(): Observable<ExamSeason[]> {
    return of([...this.examSeasons]);
  }

  createExamSeason(season: ExamSeason): Observable<ExamSeason> {
    const newSeason = { ...season, id: this.generateId('exam') };
    this.examSeasons.push(newSeason);
    return of(newSeason);
  }

  updateExamSeason(id: string, season: Partial<ExamSeason>): Observable<ExamSeason> {
    const idx = this.examSeasons.findIndex(e => e.id === id);
    if (idx !== -1) {
      this.examSeasons[idx] = { ...this.examSeasons[idx], ...season };
    }
    return of(this.examSeasons[idx]);
  }

  deleteExamSeason(id: string): Observable<boolean> {
    this.examSeasons = this.examSeasons.filter(e => e.id !== id);
    return of(true);
  }

  // Helpers ---------------------------------------------------------
  private buildAuthResponse(user: User): AuthResponse {
    const payload = {
      sub: user.id,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60
    };
    const token = this.buildMockJwt(payload);
    return {
      token,
      refreshToken: token + '.r',
      user
    };
  }

  private buildMockJwt(payload: any): string {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.mock`;
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private buildTeacherProfile(user: User, subjects: TeacherSubject[], availability: TeacherAvailability[], rate: number): TeacherProfile {
    return {
      id: this.generateId('teacher'),
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber || '+44 7700 900077',
      qualifications: ['PGCE (Secondary Maths)', 'BSc (Hons) First Class', 'QTS'],
      subjects,
      hourlyRate: rate,
      experienceYears: 6,
      averageRating: 4.8,
      totalReviews: 120,
      totalClasses: 320,
      isAvailable: true,
      availability,
      verificationStatus: 'Verified',
      teachingMode: 'ONLINE',
      createdAt: new Date(),
      updatedAt: new Date(),
      profilePicture: 'https://via.placeholder.com/120',
      bio: 'Passionate educator focused on student outcomes.'
    };
  }

  private buildStudentProfile(user: User): StudentProfile {
    return {
      id: this.generateId('student'),
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber || '+44 7700 900078',
      gradeLevel: 'Year 11 (GCSE)',
      school: 'King''s College School, Wimbledon',
      focusAreas: ['Mathematics', 'Science'],
      targetExams: ['GCSE 2025 (Edexcel/AQA)', 'A-Level 2027'],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private seedData(): void {
    const studentUser: User = {
      id: 'user-student',
      email: 'student@classbooking.com',
      fullName: 'Student Demo',
      role: 'Student',
      status: 'Active',
      createdAt: new Date(),
      lastLogin: new Date()
    };

    const teacherUser: User = {
      id: 'user-teacher',
      email: 'teacher@classbooking.com',
      fullName: 'Teacher Demo',
      role: 'Teacher',
      status: 'Active',
      createdAt: new Date(),
      lastLogin: new Date()
    };

    const adminUser: User = {
      id: 'user-admin',
      email: 'admin@classbooking.com',
      fullName: 'Admin Demo',
      role: 'Admin',
      status: 'Active',
      createdAt: new Date(),
      lastLogin: new Date()
    };

    this.users = [studentUser, teacherUser, adminUser];

    this.credentials = [
      { email: studentUser.email, password: 'Password123', userId: studentUser.id },
      { email: teacherUser.email, password: 'Password123', userId: teacherUser.id },
      { email: adminUser.email, password: 'Password123', userId: adminUser.id }
    ];

    const mathSubject: TeacherSubject = { id: 'sub-math', name: 'Mathematics', medium: 'English', level: 'GCSE', grades: 'Year 10 (GCSE), Year 11 (GCSE)' };
    const sciSubject: TeacherSubject = { id: 'sub-sci', name: 'Science', medium: 'English', level: 'GCSE', grades: 'Year 10 (GCSE), Year 11 (GCSE)' };
    const availability: TeacherAvailability[] = [
      { dayOfWeek: 'Monday', startTime: '09:00', endTime: '15:00' },
      { dayOfWeek: 'Wednesday', startTime: '10:00', endTime: '16:00' },
      { dayOfWeek: 'Friday', startTime: '09:00', endTime: '14:00' }
    ];

    this.teachers = [
      this.buildTeacherProfile(teacherUser, [mathSubject, sciSubject], availability, 35),
      this.buildTeacherProfile(
        {
          ...teacherUser,
          id: 'user-teacher-2',
          email: 'math@classbooking.com',
          fullName: 'Math Specialist'
        },
        [mathSubject],
        availability,
        1800
      )
    ];

    this.students = [this.buildStudentProfile(studentUser)];

    this.bookings = [
      {
        id: 'booking-1',
        studentId: studentUser.id,
        studentName: this.students[0].fullName,
        teacherId: this.teachers[0].id,
        teacherName: this.teachers[0].fullName,
        subject: 'Mathematics',
        date: new Date(),
        startTime: '09:00',
        endTime: '10:00',
        status: 'Confirmed',
        classType: 'OneTime',
        mode: 'ONLINE',
        locationOrLink: 'https://meet.google.com/mock',
        bookingGradeLevel: 'GCSE',
        price: 35,
        durationMinutes: 60,
        notes: 'Algebra basics',
        meetingLink: 'https://meet.example.com/mock',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'booking-2',
        studentId: studentUser.id,
        studentName: this.students[0].fullName,
        teacherId: this.teachers[1].id,
        teacherName: this.teachers[1].fullName,
        subject: 'Science',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        startTime: '11:00',
        endTime: '12:00',
        status: 'Completed',
        classType: 'OneTime',
        mode: 'ONLINE',
        locationOrLink: 'https://meet.google.com/mock',
        bookingGradeLevel: 'GCSE',
        price: 35,
        durationMinutes: 60,
        notes: 'Physics revision',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'booking-3',
        studentId: studentUser.id,
        studentName: this.students[0].fullName,
        teacherId: this.teachers[0].id,
        teacherName: this.teachers[0].fullName,
        subject: 'Mathematics',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        startTime: '13:00',
        endTime: '14:00',
        status: 'Pending',
        classType: 'OneTime',
        mode: 'ONLINE',
        locationOrLink: 'https://meet.google.com/mock',
        bookingGradeLevel: 'GCSE',
        price: 35,
        durationMinutes: 60,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.resources = [
      { id: 'res-1', title: 'Mathematics 2024 Past Paper 1 & 2', type: 'PastPaper', url: 'https://example.com/math-2024.pdf', description: 'Official specimen paper with complete step-by-step marking scheme', uploadedAt: new Date() },
      { id: 'res-2', title: 'Pure Mathematics Summary Revision Guide', type: 'Notes', url: 'https://example.com/pure-math.pdf', description: 'Formulas, key derivations, and calculus exam tips', uploadedAt: new Date() },
      { id: 'res-3', title: 'Science Model Paper with Answers 2024', type: 'PastPaper', url: 'https://example.com/science-2024.pdf', description: 'Chemistry, Physics & Biology question bank', uploadedAt: new Date() },
      { id: 'res-4', title: 'Physics Mechanics & Waves Masterclass', type: 'Notes', url: 'https://example.com/physics-notes.pdf', description: 'Detailed derivations and exam problems', uploadedAt: new Date() },
      { id: 'res-5', title: 'Chemistry Organic Reactions Chart', type: 'Notes', url: 'https://example.com/chemistry-chart.pdf', description: 'Reaction mechanisms and synthesis pathways', uploadedAt: new Date() },
      { id: 'res-6', title: 'English Language Reading & Essay Practice', type: 'PDF', url: 'https://example.com/english-practice.pdf', description: 'Model essays and comprehension tests', uploadedAt: new Date() }
    ];

    this.examPreparations = [
      {
        id: 'exam-1',
        examType: 'GCSE',
        subject: 'Mathematics',
        description: 'Structured preparation plan for GCSE Mathematics (Edexcel/AQA) with past papers & model answers',
        resources: [this.resources[0], this.resources[1]]
      },
      {
        id: 'exam-2',
        examType: 'GCSE',
        subject: 'Science',
        description: 'Science revision bundle covering Biology, Chemistry, and Physics fundamentals',
        resources: [this.resources[2]]
      },
      {
        id: 'exam-3',
        examType: 'GCSE',
        subject: 'English',
        description: 'Comprehensive English language and essay writing exam masterclass',
        resources: [this.resources[5]]
      },
      {
        id: 'exam-4',
        examType: 'ALevel',
        subject: 'Physics',
        description: 'Advanced Level Physics unit-by-unit past paper questions and worked solutions',
        resources: [this.resources[3]]
      },
      {
        id: 'exam-5',
        examType: 'ALevel',
        subject: 'Chemistry',
        description: 'Organic, Inorganic, and Physical Chemistry master exam preparation bundle',
        resources: [this.resources[4]]
      }
    ];

    this.holidays = [
      { id: 'holiday-1', name: 'Good Friday', date: new Date('2025-04-18'), description: 'UK Bank Holiday' }, { id: 'holiday-2', name: 'Easter Monday', date: new Date('2025-04-21'), description: 'UK Bank Holiday' }, { id: 'holiday-3', name: 'Summer Bank Holiday', date: new Date('2025-08-25'), description: 'UK Bank Holiday' }
    ];

    this.examSeasons = [
      { id: 'exam-season-1', name: 'GCSE Summer 2025', startDate: new Date('2025-08-01'), endDate: new Date('2025-12-01'), examType: 'GCSE' }
    ];

    this.systemSettings = {
      id: 'settings-1',
      platformName: 'ClassBooking',
      platformEmail: 'support@classbooking.com',
      defaultHourlyRate: 35,
      maxClassDurationMinutes: 120,
      minClassDurationMinutes: 30,
      cancellationDeadlineHours: 12,
      platformCommissionPercentage: 15
    };
  }
}
