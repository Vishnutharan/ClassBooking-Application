import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const api = environment.apiUrl.replace(/\/$/, '');
  if (!req.url.startsWith(`${api}/`) || /\/auth\/(login|register)$/.test(req.url)) return next(req);
  const token = auth.getToken();
  const authenticated = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authenticated).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token && !auth.isDemoSession()) {
        auth.logout();
      }
      return throwError(() => error);
    })
  );
};
