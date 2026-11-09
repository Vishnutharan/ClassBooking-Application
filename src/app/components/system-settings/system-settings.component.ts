import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { SystemSettings } from '../../core/models/shared.models';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './system-settings.component.html',
  styleUrl: './system-settings.component.css'
})
export class SystemSettingsComponent implements OnInit {
  private adminService = inject(AdminService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  settingsForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  currentSettings: SystemSettings | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadSettings();
  }

  private initForm(): void {
    this.settingsForm = this.fb.group({
      platformName: ['', [Validators.required, Validators.minLength(3)]],
      platformEmail: ['', [Validators.required, Validators.email]],
      defaultHourlyRate: [35, [Validators.required, Validators.min(0)]],
      minClassDurationMinutes: [30, [Validators.required, Validators.min(15)]],
      maxClassDurationMinutes: [180, [Validators.required, Validators.max(480)]],
      cancellationDeadlineHours: [24, [Validators.required, Validators.min(1)]],
      platformCommissionPercentage: [15, [Validators.required, Validators.min(0), Validators.max(100)]]
    });
  }

  private loadSettings(): void {
    this.isLoading = true;
    this.adminService.getSystemSettings().subscribe({
      next: (settings) => {
        this.currentSettings = settings;
        this.settingsForm.patchValue(settings);
        this.isLoading = false;
      },
      error: () => {
        this.notificationService.showError('Failed to load settings');
        this.isLoading = false;
      }
    });
  }

  saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.notificationService.showWarning('Please fill all required fields');
      return;
    }

    this.isSaving = true;
    this.adminService.updateSystemSettings(this.settingsForm.value).subscribe({
      next: (settings) => {
        this.currentSettings = settings;
        this.notificationService.showSuccess('Settings saved successfully');
        this.isSaving = false;
      },
      error: () => {
        this.notificationService.showError('Failed to save settings');
        this.isSaving = false;
      }
    });
  }

  resetForm(): void {
    if (this.currentSettings) {
      this.settingsForm.patchValue(this.currentSettings);
      this.notificationService.showInfo('Form reset to last saved values');
    }
  }

  validateMinMax(): void {
    const min = this.settingsForm.get('minClassDurationMinutes')?.value;
    const max = this.settingsForm.get('maxClassDurationMinutes')?.value;

    if (min && max && min >= max) {
      this.notificationService.showWarning('Minimum duration must be less than maximum');
    }
  }
}
