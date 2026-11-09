/**
 * Teacher Communication Models
 * Models for messaging and communication with students
 */

export interface TeacherMessage {
    id: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    senderRole: 'Teacher' | 'Student';
    recipientId: string;
    recipientName: string;
    subject: string;
    content: string;
    attachments: MessageAttachment[];
    isRead: boolean;
    readAt?: Date;
    sentAt: Date;
    priority: 'Normal' | 'High' | 'Urgent';
}

export interface ConversationMessage {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    sentAt: Date;
    isRead: boolean;
}

export interface Conversation {
    id: string;
    participants: ConversationParticipant[];
    subject: string;
    lastMessage: ConversationMessage | null;
    unreadCount: number;
    messages?: ConversationMessage[];
    createdAt?: Date;
    updatedAt: Date;
    status?: 'Active' | 'Archived';
}

export interface ConversationParticipant {
    userId: string;
    name: string;
    role: 'Teacher' | 'Student';
    profilePicture?: string;
    lastReadAt?: Date;
}

export interface MessageAttachment {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    url: string;
    uploadedAt: Date;
}

export interface Announcement {
    id: string;
    teacherId: string;
    teacherName: string;
    title: string;
    content: string;
    recipientType: 'All Students' | 'Specific Subject' | 'Specific Grade' | 'Individual Students';
    recipients: string[]; // List of student IDs
    subject?: string; // If sent to specific subject
    grade?: string; // If sent to specific grade
    attachments: MessageAttachment[];
    isPinned: boolean;
    expiryDate?: Date;
    sentAt: Date;
    viewCount: number;
    viewedBy: string[]; // Student IDs who viewed
}

export interface MessageStats {
    totalConversations: number;
    unreadMessages: number;
    todayMessages: number;
    averageResponseTime: number; // in hours
    mostActiveStudents: StudentMessageActivity[];
}

export interface StudentMessageActivity {
    studentId: string;
    studentName: string;
    messageCount: number;
    lastMessageDate: Date;
}

export interface MessageFilter {
    searchTerm?: string;
    unreadOnly?: boolean;
    startDate?: Date;
    endDate?: Date;
    studentId?: string;
    subject?: string;
    priority?: 'Normal' | 'High' | 'Urgent';
}

export interface QuickReply {
    id: string;
    teacherId: string;
    title: string;
    content: string;
    category: 'Greeting' | 'Schedule' | 'Assignment' | 'Feedback' | 'Other';
    usageCount: number;
    createdAt: Date;
}

export interface MessageTemplate {
    id: string;
    teacherId: string;
    name: string;
    subject: string;
    content: string;
    variables: string[]; // e.g., ['studentName', 'subject', 'date']
    category: 'Welcome' | 'Reminder' | 'Feedback' | 'Announcement' | 'Follow-up';
}

export interface NotificationPreference {
    teacherId: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    notifyOnNewMessage: boolean;
    notifyOnStudentReply: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
}
