import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastr = inject(ToastrService);
  return next(req).pipe(
    catchError(err => {
      const msg = err.error?.message || 'An unexpected error occurred';
      toastr.error(msg, 'Error');
      return throwError(() => err);
    })
  );
};
