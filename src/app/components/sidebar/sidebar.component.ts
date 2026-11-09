import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/shared.models';
import { NotificationService } from '../../core/services/notification.service';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  roles: string[];
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser: boolean;

  currentUser: User | null = null;
  isCollapsed = false;
  menuSections: { title: string; items: MenuItem[] }[] = [];

  private studentMenuItems: MenuItem[] = [
    { icon: '??', label: 'Dashboard', route: '/dashboard/student', roles: ['Student'] },
    { icon: '??', label: 'Book Class', route: '/book-class', roles: ['Student'] },
    { icon: '🔍', label: 'Find Teacher', route: '/find-teacher', roles: ['Student'] },
    { icon: '??', label: 'My Bookings', route: '/my-bookings', roles: ['Student'] },
    { icon: '??', label: 'Lesson Planner', route: '/student/lesson-plans', roles: ['Student'] },
    { icon: '??', label: 'Exam Prep', route: '/exam-preparation', roles: ['Student'] },
    { icon: '??', label: 'Educational Content', route: '/educational-content', roles: ['Student'] },
    { icon: '??', label: 'Progress', route: '/student/progress', roles: ['Student'] },
    { icon: '??', label: 'Timetable', route: '/timetable', roles: ['Student'] }
  ];

  private teacherMenuItems: MenuItem[] = [
    { icon: '🏠', label: 'Dashboard', route: '/dashboard/teacher', roles: ['Teacher'] },
    { icon: '📊', label: 'Analytics', route: '/teacher/analytics', roles: ['Teacher'] },
    { icon: '✅', label: 'Attendance', route: '/teacher/attendance', roles: ['Teacher'] },
    { icon: '📝', label: 'Lesson Planner', route: '/teacher/lesson-planner', roles: ['Teacher'] },
    { icon: '👥', label: 'My Classes', route: '/my-classes', roles: ['Teacher'] },
    { icon: '👤', label: 'My Profile', route: '/manage-profile', roles: ['Teacher'] },
    { icon: '📅', label: 'Manage Schedule', route: '/manage-schedule', roles: ['Teacher'] },
    { icon: '⭐', label: 'Reviews & Ratings', route: '/reviews-ratings', roles: ['Teacher'] },
    { icon: '📤', label: 'Upload Resources', route: '/resources-upload', roles: ['Teacher'] }
  ];

  private adminMenuItems: MenuItem[] = [
    { icon: '🏠', label: 'Dashboard', route: '/dashboard/admin', roles: ['Admin'] },
    { icon: '👥', label: 'User Management', route: '/admin/users', roles: ['Admin'] },
    { icon: '📅', label: 'Timetable', route: '/admin/timetable', roles: ['Admin'] },
    { icon: '📊', label: 'Reports', route: '/admin/reports', roles: ['Admin'] },
    { icon: '⚙️', label: 'Settings', route: '/admin/settings', roles: ['Admin'] }
  ];

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.updateMenu();
    });

    if (this.isBrowser && window.innerWidth <= 1024) {
      this.isCollapsed = true;
    }
  }

  private updateMenu(): void {
    if (!this.currentUser) {
      this.menuSections = [];
      return;
    }

    const role = this.currentUser.role;
    let menuItems: MenuItem[] = [];

    switch (role) {
      case 'Student':
        menuItems = this.studentMenuItems;
        break;
      case 'Teacher':
        menuItems = this.teacherMenuItems;
        break;
      case 'Admin':
        menuItems = this.adminMenuItems;
        break;
    }

    this.menuSections = [
      {
        title: 'Main Menu',
        items: menuItems.filter(item => item.roles.includes(role))
      }
    ];
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  openSupport(): void {
    this.notificationService.showInfo('For account or booking help, contact your platform administrator.');
  }
}

