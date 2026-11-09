import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { ResourceService, Resource } from '../../core/services/resource.service';

@Component({
  selector: 'app-resources-upload',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './resources-upload.component.html',
  styleUrl: './resources-upload.component.css'
})
export class ResourcesUploadComponent implements OnInit {
  private fb = inject(FormBuilder);
  privatenotificationService = inject(NotificationService);
  private resourceService = inject(ResourceService);

  uploadForm!: FormGroup;
  resources: Resource[] = [];
  isLoading = false;
  isUploading = false;
  uploadProgress = 0;

  fileTypes = ['PDF', 'Video', 'Document', 'Image', 'Quiz'];
  subjects = ['Mathematics', 'English Language', 'English Literature', 'Biology', 'Chemistry', 'Physics', 'Combined Science', 'Computer Science', 'History', 'Geography', 'French', 'Spanish', 'Economics', 'Psychology'];
  levels = ['KS2 / 11+', 'KS3', 'GCSE', 'A-Level'];

  selectedFile: File | null = null;
  dragOverActive = false;

  ngOnInit(): void {
    this.initForm();
    this.loadResources();
  }

  private initForm(): void {
    this.uploadForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      type: ['PDF', Validators.required],
      subject: ['Mathematics', Validators.required],
      level: ['GCSE', Validators.required],
      studentId: [''], // Added Student Id
      isPublic: [false]
    });
  }

  private loadResources(): void {
    this.isLoading = true;
    this.resourceService.getTeacherResources().subscribe({
      next: (data) => {
        this.resources = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load resources', err);
        // this.notificationService.showError('Failed to load resources');
        this.isLoading = false;
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      // this.notificationService.showSuccess(`File selected: ${file.name}`);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverActive = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverActive = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverActive = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
      // this.notificationService.showSuccess(`File selected: ${files[0].name}`);
    }
  }

  uploadResource(): void {
    if (this.uploadForm.invalid) {
      // this.notificationService.showWarning('Please fill all required fields');
      return;
    }

    if (!this.selectedFile) {
      // this.notificationService.showWarning('Please select a file to upload');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0; // Reset progress

    const formData = new FormData();
    formData.append('title', this.uploadForm.get('title')?.value);
    formData.append('description', this.uploadForm.get('description')?.value);
    formData.append('subject', this.uploadForm.get('subject')?.value);
    formData.append('level', this.uploadForm.get('level')?.value);
    
    const studentId = this.uploadForm.get('studentId')?.value;
    if (studentId) {
        formData.append('studentId', studentId);
    }
    
    // Note: 'type' is determined by backend from mime type in my implementation, 
    // but we can send it or let backend handle it. My backend uses mime type.
    // But sending selected type helps if mime type is generic.
    // However, Request DTO didn't have 'Type', it had logic `GetResourceType`.
    // So 'type' from form is ignored by backend logic unless I update backend. 
    // I'll stick to backend logic for now.

    formData.append('file', this.selectedFile);

    // Mock progress for now as HttpClient doesn't report it easily without extra config
    const interval = setInterval(() => {
        if (this.uploadProgress < 90) this.uploadProgress += 10;
    }, 200);

    this.resourceService.uploadResource(formData).subscribe({
      next: (res) => {
        clearInterval(interval);
        this.uploadProgress = 100;
        
        // Add to list
        this.resources.unshift(res);
        
        // this.notificationService.showSuccess('Resource uploaded successfully');
        this.resetForm();
        this.isUploading = false;
      },
      error: (err) => {
        clearInterval(interval);
        this.isUploading = false;
        console.error(err);
        // this.notificationService.showError('Failed to upload resource');
      }
    });
  }

  private resetForm(): void {
    this.uploadForm.reset({
      type: 'PDF',
      subject: 'Mathematics',
      level: 'GCSE',
      studentId: '',
      isPublic: false
    });
    this.selectedFile = null;
    this.uploadProgress = 0;
  }

  editResource(resource: Resource): void {
      // Edit not implemented in backend fully yet (Update endpoint missing in plan)
      // So alert user
      alert('Edit feature coming soon!');
  }

  deleteResource(id: string): void {
    if (confirm('Are you sure you want to delete this resource?')) {
      this.resourceService.deleteResource(id).subscribe({
         next: () => {
             this.resources = this.resources.filter(r => r.id !== id);
             // this.notificationService.showSuccess('Resource deleted successfully');
         },
         error: (err) => console.error(err)
      });
    }
  }

  toggleVisibility(resource: Resource): void {
    // Backend update for visibility not implemented
     alert('Visibility toggle coming soon!');
  }

  downloadResource(resource: Resource): void {
     window.open(resource.filePath, '_blank');
  }

  getFileSizeDisplay(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
