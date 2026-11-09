import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { AdminService, AdminReview, DashboardStats } from '../../core/services/admin.service';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PaymentIntegrationService } from '../../core/services/payment-integration.service';
import { PaymentRecord } from '../../core/models/payment.models';

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
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    averageRating: 0
  };

  recentActivities: any[] = [];
  bookingTrends: any[] = [];
  userGrowth: any[] = [];
  revenueData: any[] = [];
  topTeachers: any[] = [];
  isLoading = false;
  reviewsLoading = false;
  reviews: AdminReview[] = [];
  editingReviewId: string | null = null;
  editRating = 0;
  editComment = '';
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
    this.loadDashboard();
    this.loadReviews();
  }

  private loadDashboard(): void {
    this.isLoading = true;

    this.adminService.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.generateMockCharts();
        this.loadActivities();
        this.loadPayments();
        this.isLoading = false;
      },
      error: () => {
        this.notificationService.showError('Failed to load dashboard');
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
        this.notificationService.showError('Failed to load reviews');
        this.reviewsLoading = false;
      }
    });
  }

  private loadPayments(): void {
    this.paymentService.getAdminPayments().subscribe({
      next: (payments) => {
        this.latestPayments = (payments || []).slice(0, 5);
      },
      error: () => {
        this.latestPayments = [];
      }
    });
  }

  private generateMockCharts(): void {
    this.bookingTrends = [
      { month: 'Jan', bookings: 120 },
      { month: 'Feb', bookings: 150 },
      { month: 'Mar', bookings: 180 },
      { month: 'Apr', bookings: 160 },
      { month: 'May', bookings: 200 },
      { month: 'Jun', bookings: 220 }
    ];

    this.userGrowth = [
      { month: 'Jan', students: 45, teachers: 12 },
      { month: 'Feb', students: 62, teachers: 18 },
      { month: 'Mar', students: 88, teachers: 25 },
      { month: 'Apr', students: 110, teachers: 32 },
      { month: 'May', students: 145, teachers: 42 },
      { month: 'Jun', students: 180, teachers: 55 }
    ];

    this.revenueData = [
      { month: 'Jan', revenue: 4250 },
      { month: 'Feb', revenue: 5180 },
      { month: 'Mar', revenue: 6420 },
      { month: 'Apr', revenue: 5890 },
      { month: 'May', revenue: 7350 },
      { month: 'Jun', revenue: 8640 }
    ];

    this.topTeachers = [
      { name: 'Dr. Alistair Perera', rating: 4.9, classes: 95 },
      { name: 'Ms. Kaveesha Jayawardena', rating: 4.8, classes: 84 },
      { name: 'Mr. James Sanje', rating: 4.8, classes: 78 },
      { name: 'Mr. Mohamed Farook', rating: 4.7, classes: 66 }
    ];
  }

  private loadActivities(): void {
    this.recentActivities = [
      { icon: '🎓', message: 'New UK GCSE student registered', time: '5 minutes ago' },
      { icon: '📅', message: '1-to-1 A-Level Maths session confirmed', time: '15 minutes ago' },
      { icon: '💷', message: 'GBP Tuition payment settled (£45.00)', time: '1 hour ago' },
      { icon: '✅', message: 'Tutor DBS & QTS verification approved', time: '2 hours ago' }
    ];
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }

  startEdit(review: AdminReview): void {
    this.editingReviewId = review.id;
    this.editRating = review.rating;
    this.editComment = review.comment;
  }

  cancelEdit(): void {
    this.editingReviewId = null;
    this.editRating = 0;
    this.editComment = '';
  }

  saveReview(): void {
    if (!this.editingReviewId) return;
    this.adminService.updateReview(this.editingReviewId, this.editRating, this.editComment).subscribe({
      next: () => {
        const target = this.reviews.find(r => r.id === this.editingReviewId);
        if (target) {
          target.rating = this.editRating;
          target.comment = this.editComment;
        }
        this.notificationService.showSuccess('Review updated');
        this.cancelEdit();
      },
      error: () => this.notificationService.showError('Failed to update review')
    });
  }

  deleteReview(id: string): void {
    this.adminService.deleteReview(id).subscribe({
      next: () => {
        this.reviews = this.reviews.filter(r => r.id !== id);
        this.notificationService.showSuccess('Review deleted');
        if (this.editingReviewId === id) {
          this.cancelEdit();
        }
      },
      error: () => this.notificationService.showError('Failed to delete review')
    });
  }
}
