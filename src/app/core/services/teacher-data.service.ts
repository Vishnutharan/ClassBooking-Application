import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Import all teacher feature models
import {
    AttendanceRecord,
    AttendanceStats,
    StudentAttendanceSummary,
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
    TeacherMessage,
    ConversationMessage,
    Conversation,
    Announcement
} from '../models/teacher-communication.models';
import { environment } from '../../../environments/environment';

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
                if (!Array.isArray(records)) return [];
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
            })
        );
    }

    markAttendance(records: AttendanceRecord[]): Observable<boolean> {
        return this.http.post<boolean>(`${this.apiUrl}/attendance`, records);
    }

    // --- STUDENT MANAGEMENT DATA ---

    // --- STUDENT MANAGEMENT DATA ---

    getTeacherStudents(teacherId: string): Observable<TeacherStudent[]> {
        return this.http.get<any[]>(`${this.apiUrl}/students`).pipe(
            map(response => {
                if (!Array.isArray(response)) {
                    console.warn('Response is not an array:', response);
                    return [];
                }
                
                return response.map(item => ({
                    id: item.id || item.Id || item.studentId || item.StudentId || 'unknown',
                    userId: item.userId || item.UserId || item.studentId || item.StudentId || 'unknown',
                    fullName: item.fullName || item.FullName || item.studentName || item.StudentName || 'Unknown Student',
                    email: item.email || item.Email || 'N/A',
                    phoneNumber: item.phoneNumber || item.PhoneNumber || 'N/A',
                    grade: item.grade || item.Grade || 'N/A',
                    subjects: (item.subjects || item.Subjects) && (item.subjects || item.Subjects).length > 0 ? (item.subjects || item.Subjects) : (item.subject || item.Subject ? [item.subject || item.Subject] : []),
                    enrollmentDate: item.enrolledDate ? new Date(item.enrolledDate) : (item.EnrolledDate ? new Date(item.EnrolledDate) : new Date()),
                    status: (item.isActive || item.IsActive) ? 'Active' : 'Inactive',
                    performanceLevel: 'Good',
                    profilePicture: item.profilePicture || item.ProfilePicture || '',
                    school: item.school || item.School,
                    parentName: item.parentName || item.ParentName,
                    parentContact: item.parentContact || item.ParentContact
                } as TeacherStudent));
            })
        );
    }

    getStudentProgress(studentId: string): Observable<StudentProgress> {
        return this.http.get<StudentProgress>(`${this.apiUrl}/students/${studentId}/progress`);
    }

    // --- LESSON PLANNING DATA ---

    getLessonPlans(teacherId: string): Observable<LessonPlan[]> {
        return this.http.get<LessonPlan[]>(`${this.apiUrl}/lesson-plans`);
    }

    saveLessonPlan(plan: LessonPlan): Observable<LessonPlan> {
        if (plan.id && !plan.id.startsWith('lp-temp')) {
            return this.http.put<LessonPlan>(`${this.apiUrl}/lesson-plans/${plan.id}`, plan);
        } else {
            return this.http.post<LessonPlan>(`${this.apiUrl}/lesson-plans`, plan);
        }
    }

    deleteLessonPlan(planId: string): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/lesson-plans/${planId}`);
    }

    // --- ANALYTICS DATA ---

    getTeacherAnalytics(teacherId: string, period: 'daily' | 'weekly' | 'monthly' | 'yearly'): Observable<TeacherMetrics> {
        return this.http.get<TeacherMetrics>(`${this.apiUrl}/analytics`, {
            params: { period }
        });
    }

    getEarningsAnalytics(teacherId: string, period: 'monthly' | 'yearly'): Observable<EarningsAnalytics> {
        return this.http.get<EarningsAnalytics>(`${this.apiUrl}/analytics/earnings`, {
            params: { period }
        });
    }

    getSubjectPerformance(teacherId: string): Observable<SubjectPerformance[]> {
        return this.http.get<SubjectPerformance[]>(`${this.apiUrl}/analytics/subjects`);
    }

    // --- COMMUNICATION DATA ---

    getConversations(teacherId: string): Observable<Conversation[]> {
        return this.http.get<Conversation[]>(`${this.apiUrl}/communication/conversations`);
    }

    getAnnouncements(teacherId: string): Observable<Announcement[]> {
        return this.http.get<Announcement[]>(`${this.apiUrl}/communication/announcements`);
    }

    sendMessage(conversationId: string, content: string): Observable<ConversationMessage> {
        return this.http.post<ConversationMessage>(`${this.apiUrl}/communication/messages`, { conversationId, content });
    }

    getMessages(conversationId: string): Observable<ConversationMessage[]> {
        return this.http.get<ConversationMessage[]>(`${this.apiUrl}/communication/conversations/${encodeURIComponent(conversationId)}/messages`);
    }

    markConversationRead(conversationId: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/communication/conversations/${encodeURIComponent(conversationId)}/read`, {});
    }

    createAnnouncement(announcement: Announcement): Observable<Announcement> {
        return this.http.post<Announcement>(`${this.apiUrl}/communication/announcements`, announcement);
    }
}
