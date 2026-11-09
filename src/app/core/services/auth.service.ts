// src/app/Service/auth.service.ts

import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, of, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { User } from '../models/user.models';
import { LoginRequest, AuthResponse } from '../models/auth.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Initialize with safe defaults
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  currentUser$ = this.currentUserSubject.asObservable();
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private apiUrl = `${environment.apiUrl}/auth`;
  private tokenKey = 'access_token';
  private refreshTokenKey = 'refresh_token';
  private userKey = 'current_user';

  constructor() {
    // Explicitly load state in constructor to correctness on client
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
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.handleAuthResponse(response))
    );
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
    // TODO: Implement real refresh token endpoint in backend
    // For now, we just return an error or mock it if needed, but let's keep it simple
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

  // 🔑 Central place to store tokens + user after login / register / refresh
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
      return userStr ? JSON.parse(userStr) as User : null;
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
