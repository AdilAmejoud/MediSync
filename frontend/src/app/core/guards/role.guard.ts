import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DevModeService } from '../services/dev-mode.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const devMode = inject(DevModeService);
  if (devMode.isActive()) return true;
  const auth     = inject(AuthService);
  const router   = inject(Router);
  const required = route.data['role'] as string;
  if (auth.getRole() === required) return true;
  router.navigate(['/unauthorized']);
  return false;
};
