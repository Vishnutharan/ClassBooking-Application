import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { TeacherDataService } from '../../core/services/teacher-data.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Conversation, ConversationMessage, Announcement } from '../../core/models/teacher-communication.models';

@Component({
  selector: 'app-teacher-messages', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './teacher-messages.component.html', styleUrls: ['./teacher-messages.component.css']
})
export class TeacherMessagesComponent implements OnInit {
  private teacherDataService = inject(TeacherDataService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  conversations: Conversation[] = [];
  announcements: Announcement[] = [];
  messages: ConversationMessage[] = [];
  selectedConversation: Conversation | null = null;
  replyText = '';
  activeTab: 'messages' | 'announcements' = 'messages';
  unreadCount = 0;
  isLoadingMessages = false;
  isSendingMessage = false;
  showAnnouncementForm = false;
  isSavingAnnouncement = false;
  announcementDraft = { title: '', content: '', targetAudience: 'All' };

  ngOnInit(): void { this.loadConversations(); this.loadAnnouncements(); }

  loadConversations(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.teacherDataService.getConversations(user.id).subscribe({
      next: conversations => {
        this.conversations = conversations;
        this.unreadCount = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
      },
      error: () => this.notificationService.showError('Could not load your conversations.')
    });
  }

  loadAnnouncements(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.teacherDataService.getAnnouncements(user.id).subscribe({
      next: announcements => this.announcements = announcements,
      error: () => this.notificationService.showError('Could not load announcements.')
    });
  }

  openConversation(conversation: Conversation): void {
    this.selectedConversation = conversation;
    this.messages = [];
    this.isLoadingMessages = true;
    this.teacherDataService.getMessages(conversation.id).pipe(finalize(() => this.isLoadingMessages = false)).subscribe({
      next: messages => this.messages = messages,
      error: () => this.notificationService.showError('Could not load this conversation.')
    });
    if (conversation.unreadCount > 0) {
      this.teacherDataService.markConversationRead(conversation.id).subscribe({
        next: () => {
          conversation.unreadCount = 0;
          this.unreadCount = this.conversations.reduce((sum, item) => sum + item.unreadCount, 0);
        },
        error: () => this.notificationService.showError('Could not update the unread status.')
      });
    }
  }

  closeConversation(): void { this.selectedConversation = null; this.loadConversations(); }

  sendReply(): void {
    const content = this.replyText.trim();
    const conversation = this.selectedConversation;
    if (!content || !conversation || this.isSendingMessage) return;
    if (content.length > 4000) {
      this.notificationService.showWarning('Messages must be 4,000 characters or fewer.');
      return;
    }
    this.isSendingMessage = true;
    this.teacherDataService.sendMessage(conversation.id, content).pipe(finalize(() => this.isSendingMessage = false)).subscribe({
      next: message => {
        this.messages = [...this.messages, message];
        this.replyText = '';
        conversation.lastMessage = message;
        conversation.updatedAt = message.sentAt;
        this.notificationService.showSuccess('Message sent.');
      },
      error: () => this.notificationService.showError('Message could not be sent. Please try again.')
    });
  }

  isOwnMessage(message: ConversationMessage): boolean {
    return message.senderId === this.authService.getCurrentUser()?.id;
  }

  conversationName(conversation: Conversation): string {
    const userId = this.authService.getCurrentUser()?.id;
    return conversation.participants.find(participant => participant.userId !== userId)?.name || 'Conversation';
  }

  createAnnouncement(): void {
    if (!this.announcementDraft.title.trim() || !this.announcementDraft.content.trim()) {
      this.notificationService.showWarning('Enter an announcement title and message.');
      return;
    }
    this.isSavingAnnouncement = true;
    this.teacherDataService.createAnnouncement(this.announcementDraft as unknown as Announcement)
      .pipe(finalize(() => this.isSavingAnnouncement = false)).subscribe({
        next: announcement => {
          this.announcements = [announcement, ...this.announcements];
          this.showAnnouncementForm = false;
          this.announcementDraft = { title: '', content: '', targetAudience: 'All' };
          this.notificationService.showSuccess('Announcement published.');
        },
        error: () => this.notificationService.showError('Could not publish announcement. Please try again.')
      });
  }
}
