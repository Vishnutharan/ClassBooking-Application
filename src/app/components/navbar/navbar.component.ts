import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/shared.models';

@Component({
  selector: 'app-navbar', standalone: true, imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './navbar.component.html', styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private userSub?: Subscription;
  private clickListener?: (event: MouseEvent) => void;
  currentUser: User | null = null;
  searchQuery = '';
  isDarkMode = false;
  showNotifications = false;
  showUserMenu = false;

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe(user => this.currentUser = user);
    if (!this.isBrowser) return;
    this.isDarkMode = localStorage.getItem('classbooking-theme') === 'dark';
    document.documentElement.classList.toggle('theme-dark', this.isDarkMode);
    this.clickListener = event => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-wrapper')) this.showNotifications = false;
      if (!target.closest('.user-wrapper')) this.showUserMenu = false;
    };
    document.addEventListener('click', this.clickListener);
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    if (this.clickListener) document.removeEventListener('click', this.clickListener);
  }

  navigate(path: string): void {
    this.showUserMenu = false;
    void this.router.navigateByUrl(path);
  }

  navigateToHome(): void {
    const role = this.currentUser?.role;
    this.navigate(role === 'Student' ? '/dashboard/student' : role === 'Teacher' ? '/dashboard/teacher' : role === 'Admin' ? '/dashboard/admin' : '/');
  }

  onSearch(): void {
    const search = this.searchQuery.trim();
    if (!search || this.currentUser?.role !== 'Student') return;
    this.showUserMenu = false;
    void this.router.navigate(['/find-teacher'], { queryParams: { search } });
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    if (!this.isBrowser) return;
    document.documentElement.classList.toggle('theme-dark', this.isDarkMode);
    localStorage.setItem('classbooking-theme', this.isDarkMode ? 'dark' : 'light');
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showUserMenu = false;
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;
  }

  logout(): void { this.authService.logout(); }
}
