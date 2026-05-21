import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DevModeService } from '../services/dev-mode.service';

export const authGuard: CanActivateFn = () => {
  const devMode = inject(DevModeService);
  if (devMode.isActive()) return true;
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigate(['/auth/login']);
  return false;
};
