import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TeacherService } from '../../core/services/teacher.service';
import { NotificationService } from '../../core/services/notification.service';
import { User, TeacherProfile, TeacherSubject } from '../../core/models/shared.models';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-manage-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './manage-profile.component.html',
  styleUrl: './manage-profile.component.css'
})
export class ManageProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private teacherService = inject(TeacherService);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  currentUser: User | null = null;
  currentProfile: TeacherProfile | null = null;
  isLoading = false;
  isSaving = false;

  profilePicture: string | null = null;

  showDeleteModal = false;
  deleteConfirmEmail = '';
  deactivatePassword = '';

  // Subject Management
  showSubjectModal = false;
  newSubject: Partial<TeacherSubject> = {
    name: '',
    medium: 'English',
    level: 'OLevel',
    grades: '',
    classTypes: ['PERSONAL_1_1'] // Using defaults
  };
  
  availableGrades = ['Year 7 (KS3)', 'Year 8 (KS3)', 'Year 9 (KS3)', 'Year 10 (GCSE)', 'Year 11 (GCSE)', 'Year 12 (A-Level)', 'Year 13 (A-Level)', '11+ Prep', 'Primary (KS1/KS2)', 'University'];
  selectedGrades: string[] = [];

  subjectOptionsList = [
    'Mathematics', 'Combined Science', 'English Language', 'History', 'Geography', 'Psychology', 
    'English Literature', 'Computer Science', 'French', 'Economics', 
    'Accounting', 'Physics', 'Chemistry', 'Biology'
  ];

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.initForms();
    this.loadProfile();
  }

  private initForms(): void {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: [{ value: '', disabled: true }],
      phoneNumber: [''],
      hourlyRate: [0],
      experienceYears: [0],
      bio: [''],
      policies: [''],
      teachingMode: ['ONLINE', Validators.required],
      locationAddress: [''],
      meetingLink: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    });

  }

  private loadProfile(): void {
    this.isLoading = true;
    
    // First fill basic info from Auth User
    if (this.currentUser) {
       this.profileForm.patchValue({
         fullName: this.currentUser.fullName,
         email: this.currentUser.email
       });
    }

    // Then fetch full Teacher Profile from API
    if (this.currentUser?.role === 'Teacher') {
        this.teacherService.getMyProfile().subscribe({
        next: (profile) => {
            this.currentProfile = profile;
            this.profileForm.patchValue({
            fullName: profile.fullName,
            email: profile.email,
            phoneNumber: profile.phoneNumber || '',
            experienceYears: profile.experienceYears || 0,
            hourlyRate: profile.hourlyRate || 0,
            bio: profile.bio || '',
            policies: profile.policies || '',
            teachingMode: profile.teachingMode || 'ONLINE',
            locationAddress: profile.locationAddress || '',
            meetingLink: profile.meetingLink || ''
            });
            this.profilePicture = profile.profilePicture || null;
            this.isLoading = false;
        },
        error: (err) => {
            console.error('Failed to load profile', err);
            // If 404, maybe profile not created yet, just keep loading false
            this.isLoading = false;
        }
        });
    } else {
        this.isLoading = false;
    }
  }

  onProfilePictureChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profilePicture = e.target.result;
      };
      reader.readAsDataURL(file);

      // Upload immediately
      this.isSaving = true;
      this.teacherService.uploadProfilePicture(file).subscribe({
        next: (res) => {
           this.profilePicture = res.url;
           this.notificationService.showSuccess('Profile picture updated');
           this.isSaving = false;
        },
        error: (err) => {
            this.notificationService.showError('Failed to upload picture');
            this.isSaving = false;
        }
      });
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.onProfilePictureChange({ target: { files } });
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.notificationService.showWarning('Please fill required fields');
      return;
    }
    this.isSaving = true;

    const formValues = this.profileForm.getRawValue();

    this.teacherService.updateProfile(formValues).subscribe({
        next: (updatedProfile) => {
            this.currentProfile = updatedProfile; 
            this.notificationService.showSuccess('Profile updated successfully');
            this.isSaving = false;
        },
        error: (err) => {
            console.error('Error updating profile', err);
            this.notificationService.showError('Failed to update profile');
            this.isSaving = false;
        }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) { this.notificationService.showError('Passwords do not match.'); return; }
    this.isSaving = true;
    this.authService.changePassword(currentPassword, newPassword).pipe(finalize(() => this.isSaving = false)).subscribe({
      next: () => { this.passwordForm.reset(); this.notificationService.showSuccess('Password changed successfully.'); },
      error: error => this.notificationService.showError(error?.error?.message || 'Could not change password. Check your current password and try again.')
    });
  }

  openDeleteModal(): void {
    this.deleteConfirmEmail = '';
    this.deactivatePassword = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  confirmDelete(): void {
    if (this.deleteConfirmEmail !== this.currentUser?.email || !this.deactivatePassword) return;
    this.isSaving = true;
    this.authService.deactivateAccount(this.deactivatePassword).pipe(finalize(() => this.isSaving = false)).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.notificationService.showSuccess('Your account is deactivated. Contact an administrator if you need it restored.');
        this.authService.logout();
      },
      error: error => this.notificationService.showError(error?.error?.message || 'Account could not be deactivated. Check your password and try again.')
    });
  }

  // Subject Management Methods
  openSubjectModal(): void {
    this.newSubject = {
        name: 'Mathematics',
        medium: 'English',
        level: 'OLevel',
        grades: '',
        classTypes: ['PERSONAL_1_1']
    };
    this.selectedGrades = [];
    this.showSubjectModal = true;
  }

  closeSubjectModal(): void {
    this.showSubjectModal = false;
  }

  toggleGrade(grade: string): void {
    if (this.selectedGrades.includes(grade)) {
      this.selectedGrades = this.selectedGrades.filter(g => g !== grade);
    } else {
      this.selectedGrades.push(grade);
    }
  }

  saveSubject(): void {
    if (!this.newSubject.name) {
        this.notificationService.showWarning('Please select a subject');
        return;
    }
    if (this.selectedGrades.length === 0) {
        this.notificationService.showWarning('Please select at least one grade');
        return;
    }

    this.newSubject.grades = this.selectedGrades.join(',');
    
    // Determine level from grades simply for backend compatibility if needed
    // Logic: if any 12-13 -> ALevel, else OLevel/Secondary
    if (this.selectedGrades.some(g => g.includes('12') || g.includes('13'))) {
        this.newSubject.level = 'ALevel';
    } else {
        this.newSubject.level = 'OLevel'; // Default fallback
    }

    this.isSaving = true;
    this.teacherService.addSubject(this.newSubject as TeacherSubject).subscribe({
        next: (profile) => {
            this.currentProfile = profile;
            this.notificationService.showSuccess('Subject added successfully');
            this.isSaving = false;
            this.closeSubjectModal();
        },
        error: (err) => {
            this.notificationService.showError('Failed to add subject');
            this.isSaving = false;
        }
    });
  }

  deleteSubject(item: TeacherSubject): void {
    if(confirm(`Are you sure you want to remove ${item.name}?`)) {
        this.teacherService.removeSubject(item.id).subscribe({
            next: (profile) => {
                this.currentProfile = profile;
                this.notificationService.showSuccess('Subject removed');
            },
            error: () => this.notificationService.showError('Failed to remove subject')
        });
    }
  }
}
