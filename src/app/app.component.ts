import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { NotificationsToastComponent } from './components/notifications-toast/notifications-toast.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NotificationsToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private auth = inject(AuthService);
  private navigationSub?: Subscription;
  private previousUrl: string | null = null;
  currentUrl = this.router.url;
  title = 'ClassBooking UK';

  ngOnInit(): void {
    let lastUrl = this.router.url;
    this.navigationSub = this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        const nextUrl = event.urlAfterRedirects;
        this.previousUrl = this.isMainEntry(lastUrl) || this.isMainEntry(nextUrl) ? null : lastUrl;
        lastUrl = nextUrl;
        this.currentUrl = nextUrl;
      });
  }

  ngOnDestroy(): void { this.navigationSub?.unsubscribe(); }

  get showWorkspaceNavbar(): boolean {
    const path = this.currentUrl.split('?')[0];
    return path !== '/' && path !== '/auth';
  }

  get isDashboardPage(): boolean {
    const path = this.currentUrl.split('?')[0];
    return path.startsWith('/dashboard');
  }

  get currentUser() {
    return this.auth.getCurrentUser();
  }

  get userRole(): string {
    return this.currentUser?.role || 'Student';
  }

  get userName(): string {
    return this.currentUser?.fullName || this.userRole;
  }

  get userInitials(): string {
    return (this.userName || 'U')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  goBack(): void { void this.router.navigateByUrl(this.previousUrl || this.homeRoute()); }
  goHome(): void { void this.router.navigateByUrl(this.homeRoute()); }
  navigateTo(path: string): void { void this.router.navigateByUrl(path); }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth');
  }

  homeRoute(): string {
    const role = this.auth.getCurrentUser()?.role;
    if (role === 'Student') return '/dashboard/student';
    if (role === 'Teacher') return '/dashboard/teacher';
    if (role === 'Admin') return '/dashboard/admin';
    return '/';
  }

  private isMainEntry(url: string): boolean {
    const path = url.split('?')[0];
    return path === '/' || path === '/auth';
  }
}
