import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { AdminService, AdminReview, DashboardStats } from '../../core/services/admin.service';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PaymentIntegrationService } from '../../core/services/payment-integration.service';
import { PaymentRecord } from '../../core/models/payment.models';

const UK_DEMO_ADMIN_PAYMENTS: PaymentRecord[] = [
  {
    id: 'uk-pay-101',
    bookingId: 'bk-101',
    studentId: 'uk-stu-1',
    studentName: 'Oliver Thompson',
    studentEmail: 'oliver.t@student.co.uk',
    teacherId: 'uk-t1',
    teacherName: 'Dr. Eleanor Vance',
    teacherEmail: 'eleanor.vance@oxbridge-tutors.co.uk',
    subject: 'Edexcel GCSE Higher Maths',
    classType: 'One-to-One',
    sessionDate: new Date(Date.now() - 86400000).toISOString(),
    startTime: '16:30',
    endTime: '17:30',
    durationMinutes: 60,
    amount: 45,
    currency: 'GBP',
    paymentMethod: 'Card',
    paymentStatus: 'Paid',
    transactionReference: 'STRIPE-UK-94821',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'uk-pay-102',
    bookingId: 'bk-102',
    studentId: 'uk-stu-2',
    studentName: 'Amelia Clarke',
    studentEmail: 'amelia.clarke@sixthform.ac.uk',
    teacherId: 'uk-t2',
    teacherName: 'Prof. Arthur Pendelton',
    teacherEmail: 'a.pendelton@imperial-tuition.co.uk',
    subject: 'AQA A-Level Physics',
    classType: 'One-to-One',
    sessionDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    startTime: '18:00',
    endTime: '19:00',
    durationMinutes: 60,
    amount: 50,
    currency: 'GBP',
    paymentMethod: 'Card',
    paymentStatus: 'Paid',
    transactionReference: 'STRIPE-UK-94819',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'uk-pay-103',
    bookingId: 'bk-103',
    studentId: 'uk-stu-3',
    studentName: 'Harry Patel',
    studentEmail: 'harry.patel@grammar.sch.uk',
    teacherId: 'uk-t3',
    teacherName: 'Charlotte Kensington',
    teacherEmail: 'c.kensington@kings-english.co.uk',
    subject: 'AQA GCSE English Lit',
    classType: 'One-to-One',
    sessionDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    startTime: '17:00',
    endTime: '18:00',
    durationMinutes: 60,
    amount: 40,
    currency: 'GBP',
    paymentMethod: 'Card',
    paymentStatus: 'Paid',
    transactionReference: 'STRIPE-UK-94804',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
  }
];

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private paymentService = inject(PaymentIntegrationService);

  stats: DashboardStats = {
    totalUsers: 148,
    totalStudents: 112,
    totalTeachers: 32,
    totalBookings: 426,
    pendingBookings: 9,
    completedBookings: 384,
    totalRevenue: 19450,
    averageRating: 4.92
  };

  recentActivities: any[] = [];
  revenueData: any[] = [];
  topTeachers: any[] = [];
  isLoading = false;
  reviewsLoading = false;
  reviews: AdminReview[] = [];

  // Popup modal state for Review Moderation & DBS Info
  editingReview: AdminReview | null = null;
  editRating = 5;
  editComment = '';
  showDbsModal = false;

  today = new Date();
  latestPayments: PaymentRecord[] = [];

  ratingWidth(value: number): number {
    const safe = Number.isFinite(value) ? value : 0;
    return Math.min(Math.max(safe * 20, 0), 100);
  }

  logout(): void {
    this.authService.logout();
  }

  ngOnInit(): void {
    this.generateMockCharts();
    this.loadActivities();
    this.loadDashboard();
    this.loadReviews();
    this.loadPayments();
  }

  private loadDashboard(): void {
    this.isLoading = true;
    this.adminService.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private loadReviews(): void {
    this.reviewsLoading = true;
    this.adminService.getReviews().subscribe({
      next: (reviews) => {
        this.reviews = reviews;
        this.reviewsLoading = false;
      },
      error: () => {
        this.reviewsLoading = false;
      }
    });
  }

  private loadPayments(): void {
    this.paymentService.getAdminPayments().subscribe({
      next: (payments) => {
        const list = payments && payments.length > 0 ? payments : UK_DEMO_ADMIN_PAYMENTS;
        this.latestPayments = list.slice(0, 4);
      },
      error: () => {
        this.latestPayments = UK_DEMO_ADMIN_PAYMENTS;
      }
    });
  }

  private generateMockCharts(): void {
    this.revenueData = [
      { month: 'Jun', revenue: 3120 },
      { month: 'Jul', revenue: 3480 },
      { month: 'Aug', revenue: 2950 },
      { month: 'Sep', revenue: 4120 },
      { month: 'Oct', revenue: 4680 },
      { month: 'Nov', revenue: 5240 }
    ];

    this.topTeachers = [
      { name: 'Dr. Eleanor Vance', spec: 'Oxbridge Maths & Further Maths', rating: 4.95, classes: 112, rate: 45, dbs: 'Enhanced DBS #001849201' },
      { name: 'Prof. Arthur Pendelton', spec: 'AQA & OCR Physics / Chemistry', rating: 4.92, classes: 96, rate: 50, dbs: 'Enhanced DBS #001849532' },
      { name: 'Charlotte Kensington', spec: 'AQA English Lit & 11+ Entrance', rating: 4.89, classes: 84, rate: 40, dbs: 'Enhanced DBS #001850118' },
      { name: 'Dr. Marcus Sterling', spec: 'Edexcel GCSE & A-Level Biology', rating: 4.87, classes: 76, rate: 45, dbs: 'Enhanced DBS #001850944' }
    ];
  }

  private loadActivities(): void {
    this.recentActivities = [
      { icon: '🛡️', message: 'Enhanced DBS & QTS check verified for Dr. Eleanor Vance', time: '10m ago' },
      { icon: '💷', message: 'Stripe UK settlement (£45.00) from Oliver Thompson', time: '35m ago' },
      { icon: '🎓', message: 'New Year 11 GCSE student enrolled (Westminster Academy)', time: '1h ago' },
      { icon: '📅', message: 'Autumn GCSE & A-Level Mock Week published to timetable', time: '2h ago' }
    ];
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }

  openDbsComplianceModal(): void {
    this.showDbsModal = true;
  }

  closeDbsComplianceModal(): void {
    this.showDbsModal = false;
  }

  startEdit(review: AdminReview): void {
    this.editingReview = review;
    this.editRating = review.rating;
    this.editComment = review.comment;
  }

  cancelEdit(): void {
    this.editingReview = null;
    this.editRating = 5;
    this.editComment = '';
  }

  saveReview(): void {
    if (!this.editingReview) return;
    const targetId = this.editingReview.id;
    this.adminService.updateReview(targetId, this.editRating, this.editComment).subscribe({
      next: () => {
        const target = this.reviews.find(r => r.id === targetId);
        if (target) {
          target.rating = this.editRating;
          target.comment = this.editComment;
        }
        this.notificationService.showSuccess('Student review moderated & updated');
        this.cancelEdit();
      },
      error: () => this.notificationService.showError('Failed to update review')
    });
  }

  deleteReview(id: string): void {
    this.adminService.deleteReview(id).subscribe({
      next: () => {
        this.reviews = this.reviews.filter(r => r.id !== id);
        this.notificationService.showSuccess('Review removed from platform');
        if (this.editingReview?.id === id) {
          this.cancelEdit();
        }
      },
      error: () => this.notificationService.showError('Failed to delete review')
    });
  }
}
