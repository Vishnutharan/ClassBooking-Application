import { HttpErrorResponse, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';

export function errorInterceptor(
  req: HttpRequest<any>,
  next: any
): Observable<HttpEvent<any>> {
  const notificationService = inject(NotificationService);
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Suppress toast notifications for background GET requests or demo sessions where services provide UK fallback data
      if (authService.isDemoSession() || (req.method === 'GET' && (error.status === 401 || error.status === 403 || error.status === 404))) {
        return throwError(() => error);
      }

      let errorMessage = 'An error occurred';

      if (isPlatformBrowser(platformId) && error.error instanceof ErrorEvent) {
        errorMessage = `Error: ${error.error.message}`;
      } else {
        if (error.status === 0) {
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
        } else if (error.status === 400) {
          errorMessage = error.error?.message || 'Invalid request. Please check your input.';
        } else if (error.status === 401) {
          errorMessage = error.error?.message || 'Unauthorized. Please log in again.';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error.status === 404) {
          errorMessage = 'The requested resource was not found.';
        } else if (error.status === 409) {
          errorMessage = error.error?.message || 'Conflict: This resource already exists.';
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.status === 503) {
          errorMessage = 'Service unavailable. Please try again later.';
        } else {
          errorMessage = error.error?.message || `Error: ${error.statusText}`;
        }
      }

      notificationService.showError(errorMessage);
      return throwError(() => error);
    })
  );
}
