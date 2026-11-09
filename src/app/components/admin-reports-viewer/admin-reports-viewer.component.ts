import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { AdminService } from '../../core/services/admin.service';

interface ReportHistory {
  id: string;
  name: string;
  type: 'pdf' | 'excel';
  generatedAt: Date;
  fileSize: string;
  status: 'ready' | 'generating' | 'failed';
}

@Component({
  selector: 'app-admin-reports-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reports-viewer.component.html',
  styleUrl: './admin-reports-viewer.component.css'
})
export class AdminReportsViewerComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private adminService = inject(AdminService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser: boolean;

  reportHistory: ReportHistory[] = [];
  selectedReport: ReportHistory | null = null;
  isLoading = false;
  showScheduleForm = false;

  scheduleEmail = '';
  scheduleFrequency: 'daily' | 'weekly' | 'monthly' = 'weekly';
  reportType = 'bookings';

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Only load data if in browser
    if (this.isBrowser) {
      this.loadReportHistory();
    }
  }

  private loadReportHistory(): void {
    this.isLoading = true;

    this.adminService.getReportHistory().subscribe({
      next: (history) => {
        this.reportHistory = history;
        this.isLoading = false;
      },
      error: () => {
        this.notificationService.showError('Failed to load report history');
        this.isLoading = false;
      }
    });
  }

  viewReport(report: ReportHistory): void {
    this.selectedReport = report;

    if (report.type === 'pdf') {
      this.notificationService.showInfo(`Opening PDF: ${report.name}`);
    } else {
      this.notificationService.showInfo(`Opening Excel: ${report.name}`);
    }
  }

  downloadReport(report: ReportHistory): void {
    if (!this.isBrowser) return;

    const filename = `${report.name}.${report.type === 'pdf' ? 'pdf' : 'xlsx'}`;
    this.notificationService.showSuccess(`Downloading: ${filename}`);

    const blob = new Blob(['mock file content'], { type: report.type === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  deleteReport(report: ReportHistory): void {
    if (confirm(`Delete ${report.name}?`)) {
      this.reportHistory = this.reportHistory.filter(r => r.id !== report.id);
      this.notificationService.showSuccess('Report deleted');
    }
  }

  regenerateReport(report: ReportHistory): void {
    const index = this.reportHistory.findIndex(r => r.id === report.id);
    if (index !== -1) {
      this.reportHistory[index].status = 'generating';

      setTimeout(() => {
        this.reportHistory[index].status = 'ready';
        this.reportHistory[index].generatedAt = new Date();
        this.notificationService.showSuccess('Report regenerated successfully');
      }, 2000);
    }
  }

  openScheduleForm(): void {
    this.scheduleEmail = '';
    this.showScheduleForm = true;
  }

  closeScheduleForm(): void {
    this.showScheduleForm = false;
  }

  scheduleReport(): void {
    if (!this.scheduleEmail.trim() || !this.reportType) {
      this.notificationService.showWarning('Please fill all fields');
      return;
    }

    this.notificationService.showSuccess(
      `Report scheduled! ${this.scheduleFrequency} ${this.reportType} report will be sent to ${this.scheduleEmail}`
    );
    this.closeScheduleForm();
  }

  addDistributionList(): void {
    this.notificationService.showInfo('Distribution list functionality coming soon');
  }

  getStatusBadgeClass(status: string): string {
    return status === 'ready' ? 'ready' : status === 'generating' ? 'generating' : 'failed';
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'ready': return '✓';
      case 'generating': return '⏳';
      case 'failed': return '✕';
      default: return '?';
    }
  }
}
