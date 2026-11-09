import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/shared.models';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser: User | null = null;
  isAuthenticated = false;
  isMobileMenuOpen = false;

  features = [
    {
      icon: 'CAL',
      title: 'Smart scheduling',
      description:
        'Book, reschedule, and manage classes with live availability, reminders, and instant confirmations.'
    },
    {
      icon: 'FND',
      title: 'Find the right teacher',
      description:
        'Search by subject, experience, ratings, and availability to match every student quickly.'
    },
    {
      icon: 'DASH',
      title: 'Role-based dashboards',
      description:
        'Students, teachers, and admins each get the tools they need without clutter or confusion.'
    },
    {
      icon: 'TRK',
      title: 'Progress & exams',
      description:
        'Manage lesson plans, assignments, exam prep, results, and feedback in one place.'
    },
    {
      icon: 'PAY',
      title: 'Fees & admin',
      description: 'Handle payments, receipts, user permissions, and attendance with confidence.'
    },
    {
      icon: 'MSG',
      title: 'Messaging & alerts',
      description: 'Reminders, follow-ups, and notifications keep everyone aligned and on time.'
    }
  ];

  studentSteps = [
    {
      number: '01',
      title: 'Create your space',
      description: 'Sign up and personalize your learning goals.'
    },
    {
      number: '02',
      title: 'Book the right class',
      description: 'Filter teachers, pick a slot, and confirm instantly.'
    },
    {
      number: '03',
      title: 'Stay ready',
      description: 'Get reminders, resources, and a clear timetable.'
    },
    {
      number: '04',
      title: 'Track results',
      description: 'Follow progress, grades, and feedback from your dashboard.'
    }
  ];

  teacherSteps = [
    {
      number: '01',
      title: 'Set your profile',
      description: 'Highlight subjects, experience, and rates.'
    },
    {
      number: '02',
      title: 'Publish availability',
      description: 'Control your schedule and avoid conflicts.'
    },
    {
      number: '03',
      title: 'Accept bookings',
      description: 'Approve, message students, and prepare resources.'
    },
    {
      number: '04',
      title: 'Teach and grow',
      description: 'Track attendance, outcomes, and earnings.'
    }
  ];

  testimonials = [
    {
      name: 'Eleanor Vance',
      role: 'GCSE Parent (London)',
      avatar: 'EV',
      rating: 5,
      text:
        'We book two classes a week and everything from reminders to results is in one dashboard.'
    },
    {
      name: 'James Thornton',
      role: 'AQA & Edexcel Maths Tutor',
      avatar: 'JT',
      rating: 5,
      text:
        'Scheduling, messaging, and resource sharing are finally in one place. My no-shows dropped dramatically.'
    },
    {
      name: 'Dr. Alistair Davies',
      role: 'Sixth Form Academic Mentor (Oxford)',
      avatar: 'AD',
      rating: 5,
      text: 'ClassBooking keeps attendance, fees, and teacher performance transparent for our team.'
    }
  ];

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAuthenticated = !!user;
    });
  }

  navigateToAuth(mode: 'login' | 'register'): void {
    this.router.navigate(['/auth'], {
      queryParams: { mode }
    });
  }

  navigateToDashboard(): void {
    if (this.currentUser) {
      const role = this.currentUser.role;
      switch (role) {
        case 'Student':
          this.router.navigate(['/dashboard/student']);
          break;
        case 'Teacher':
          this.router.navigate(['/dashboard/teacher']);
          break;
        case 'Admin':
          this.router.navigate(['/dashboard/admin']);
          break;
        default:
          this.router.navigate(['/dashboard']);
      }
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  navigateToBookClass(): void {
    this.router.navigate(['/book-class']);
  }

  logout(): void {
    this.authService.logout();
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
