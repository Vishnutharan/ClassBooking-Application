import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { User } from '../models/user.models';
import { LoginRequest, AuthResponse } from '../models/auth.models';
import { environment } from '../../../environments/environment';

interface DemoAccountConfig {
  emailAliases: string[];
  password: string;
  user: User;
}

const UK_DEMO_SIGNATURE = btoa('uk-demo-signature');

const UK_DEMO_ACCOUNTS: DemoAccountConfig[] = [
  {
    emailAliases: ['admin@britannia-tuition.co.uk', 'admin@uk.com', 'admin@classbooking.com'],
    password: 'Admin@123',
    user: {
      id: 'uk-admin-1',
      email: 'admin@britannia-tuition.co.uk',
      fullName: 'Victoria Sterling (UK Admin)',
      role: 'Admin',
      phoneNumber: '+44 20 7946 0999',
      status: 'Active',
      createdAt: new Date(Date.now() - 180 * 86400000).toISOString()
    } as any
  },
  {
    emailAliases: ['eleanor.vance@oxbridge-tutors.co.uk', 'teacher@uk.com', 'tutor@britannia-tuition.co.uk'],
    password: 'Tutor@123',
    user: {
      id: 'uk-t1',
      email: 'eleanor.vance@oxbridge-tutors.co.uk',
      fullName: 'Dr. Eleanor Vance',
      role: 'Teacher',
      phoneNumber: '+44 20 7946 0192',
      status: 'Active',
      createdAt: new Date(Date.now() - 120 * 86400000).toISOString()
    } as any
  },
  {
    emailAliases: ['oliver.t@student.co.uk', 'student@uk.com', 'student@britannia-tuition.co.uk'],
    password: 'Student@123',
    user: {
      id: 'uk-stu-1',
      email: 'oliver.t@student.co.uk',
      fullName: 'Oliver Thompson',
      role: 'Student',
      phoneNumber: '+44 7700 900412',
      status: 'Active',
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString()
    } as any
  }
];

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  currentUser$ = this.currentUserSubject.asObservable();
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private apiUrl = `${environment.apiUrl}/auth`;
  private tokenKey = 'access_token';
  private refreshTokenKey = 'refresh_token';
  private userKey = 'current_user';

  constructor() {
    if (this.isBrowser) {
      this.loadSession();
    }
  }

  private loadSession(): void {
    const user = this.getUserFromToken();
    const isValid = this.hasValidToken();

    if (user && isValid) {
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
    } else {
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
    }
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    const normalizedEmail = (credentials.email || '').trim().toLowerCase();
    const matchedDemo = UK_DEMO_ACCOUNTS.find(acc =>
      acc.emailAliases.includes(normalizedEmail) &&
      (credentials.password === acc.password || credentials.password === '123456')
    );

    if (matchedDemo) {
      const demoResponse = this.buildDemoAuthResponse(matchedDemo.user);
      return of(demoResponse).pipe(
        tap(response => this.handleAuthResponse(response))
      );
    }

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  isDemoSession(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return token.endsWith(`.${UK_DEMO_SIGNATURE}`) || (this.getCurrentUser()?.id?.startsWith('uk-') ?? false);
  }

  private buildDemoAuthResponse(user: User): AuthResponse {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        exp: Math.floor(Date.now() / 1000) + 86400 * 7 // Valid for 7 days
      })
    );
    return {
      token: `${header}.${payload}.${UK_DEMO_SIGNATURE}`,
      refreshToken: 'uk-demo-refresh-token',
      user
    };
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      localStorage.removeItem(this.userKey);
    }
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/auth']);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/change-password`, { currentPassword, newPassword });
  }

  deactivateAccount(currentPassword: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/deactivate-account`, { currentPassword });
  }

  refreshToken(): Observable<AuthResponse> {
    return throwError(() => new Error('Refresh token not implemented yet'));
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value && this.hasValidToken();
  }

  hasRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  getUserRole(): string | null {
    return this.getCurrentUser()?.role || null;
  }

  private handleAuthResponse(response: AuthResponse): void {
    if (this.isBrowser) {
      if (response.token) localStorage.setItem(this.tokenKey, response.token);
      if (response.refreshToken) localStorage.setItem(this.refreshTokenKey, response.refreshToken);
      if (response.user) localStorage.setItem(this.userKey, JSON.stringify(response.user));
    }

    if (response.user) {
      this.currentUserSubject.next(response.user);
      this.isAuthenticatedSubject.next(true);
    }
  }

  private getUserFromToken(): User | null {
    if (!this.isBrowser) return null;

    try {
      const userStr = localStorage.getItem(this.userKey);
      return userStr ? (JSON.parse(userStr) as User) : null;
    } catch {
      return null;
    }
  }

  private hasValidToken(): boolean {
    if (!this.isBrowser) return false;

    const token = localStorage.getItem(this.tokenKey);
    if (!token) return false;

    try {
      const payload = this.decodeToken(token);
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  decodeToken(token: string): any {
    try {
      const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    } catch {
      return null;
    }
  }
}
