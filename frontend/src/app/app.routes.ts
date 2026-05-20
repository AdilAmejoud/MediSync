import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', loadComponent: () =>
      import('./features/landing/landing.component')
      .then(m => m.LandingComponent) },

  { path: 'auth', children: [
    { path: 'login', loadComponent: () =>
        import('./features/auth/login/login.component')
        .then(m => m.LoginComponent) },
    { path: 'register', loadComponent: () =>
        import('./features/auth/register/register.component')
        .then(m => m.RegisterComponent) },
    { path: 'forgot-password', loadComponent: () =>
        import('./features/auth/forgot-password/forgot-password.component')
        .then(m => m.ForgotPasswordComponent) },
    { path: 'reset-password', loadComponent: () =>
        import('./features/auth/reset-password/reset-password.component')
        .then(m => m.ResetPasswordComponent) },
    { path: 'verify-otp', loadComponent: () =>
        import('./features/auth/verify-otp/verify-otp.component')
        .then(m => m.VerifyOtpComponent) },
    { path: 'email-sent', loadComponent: () =>
        import('./features/auth/email-sent/email-sent.component')
        .then(m => m.EmailSentComponent) },
  ]},

  { path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { role: 'admin' },
    loadComponent: () =>
      import('./features/admin/admin-layout.component')
      .then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',    loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'doctors',      loadComponent: () => import('./features/admin/doctors/doctors.component').then(m => m.DoctorsComponent) },
      { path: 'patients',     loadComponent: () => import('./features/admin/patients/patients.component').then(m => m.PatientsComponent) },
      { path: 'appointments', loadComponent: () => import('./features/admin/appointments/appointments.component').then(m => m.AppointmentsComponent) },
      { path: 'services',     loadComponent: () => import('./features/admin/services/services.component').then(m => m.ServicesComponent) },
      { path: 'staff',        loadComponent: () => import('./features/admin/staff/staff.component').then(m => m.StaffComponent) },
      { path: 'transactions', loadComponent: () => import('./features/admin/transactions/transactions.component').then(m => m.TransactionsComponent) },
      { path: 'billing',      loadComponent: () => import('./features/admin/billing/billing.component').then(m => m.BillingComponent) },
      { path: 'reports',      loadComponent: () => import('./features/admin/reports/reports.component').then(m => m.ReportsComponent) },
      { path: 'settings',     loadComponent: () => import('./features/admin/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'notifications', loadComponent: () => import('./features/patient/notifications/notifications.component').then(m => m.NotificationsComponent) },
    ]
  },

  { path: 'medecin',
    canActivate: [authGuard, roleGuard],
    data: { role: 'medecin' },
    loadComponent: () =>
      import('./features/medecin/medecin-layout.component')
      .then(m => m.MedecinLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',     loadComponent: () => import('./features/medecin/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'appointments',  loadComponent: () => import('./features/medecin/appointments/appointments.component').then(m => m.AppointmentsComponent) },
      { path: 'schedule',      loadComponent: () => import('./features/medecin/schedule/schedule.component').then(m => m.ScheduleComponent) },
      { path: 'patient-files', loadComponent: () => import('./features/medecin/patient-files/patient-files.component').then(m => m.PatientFilesComponent) },
      { path: 'patient-files/:id', loadComponent: () => import('./features/medecin/patient-dossier/patient-dossier.component').then(m => m.PatientDossierComponent) },
      { path: 'availability',  loadComponent: () => import('./features/medecin/availability/availability.component').then(m => m.AvailabilityComponent) },
      { path: 'settings',      loadComponent: () => import('./features/medecin/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'notifications', loadComponent: () => import('./features/patient/notifications/notifications.component').then(m => m.NotificationsComponent) },
    ]
  },

  { path: 'patient',
    canActivate: [authGuard, roleGuard],
    data: { role: 'patient' },
    loadComponent: () =>
      import('./features/patient/patient-layout.component')
      .then(m => m.PatientLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',      loadComponent: () => import('./features/patient/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'doctors',        loadComponent: () => import('./features/patient/doctors/doctors.component').then(m => m.DoctorsComponent) },
      { path: 'appointments',   loadComponent: () => import('./features/patient/appointments/appointments.component').then(m => m.AppointmentsComponent) },
      { path: 'medical-folder', loadComponent: () => import('./features/patient/medical-folder/medical-folder.component').then(m => m.MedicalFolderComponent) },
      { path: 'notifications',  loadComponent: () => import('./features/patient/notifications/notifications.component').then(m => m.NotificationsComponent) },
      { path: 'prescriptions',  loadComponent: () => import('./features/patient/prescriptions/prescriptions.component').then(m => m.PrescriptionsComponent) },
      { path: 'billing',        loadComponent: () => import('./features/patient/billing/billing.component').then(m => m.BillingComponent) },
      { path: 'settings',       loadComponent: () => import('./features/patient/settings/settings.component').then(m => m.SettingsComponent) },
    ]
  },

  { path: 'secretaire',
    canActivate: [authGuard, roleGuard],
    data: { role: 'secretaire' },
    loadComponent: () =>
      import('./features/secretaire/secretaire-layout.component')
      .then(m => m.SecretaireLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',    loadComponent: () => import('./features/secretaire/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'appointments', loadComponent: () => import('./features/secretaire/appointments/appointments.component').then(m => m.AppointmentsComponent) },
      { path: 'patients',     loadComponent: () => import('./features/secretaire/patients/patients.component').then(m => m.PatientsComponent) },
      { path: 'registration', loadComponent: () => import('./features/secretaire/registration/registration.component').then(m => m.RegistrationComponent) },
      { path: 'billing',      loadComponent: () => import('./features/secretaire/billing/billing.component').then(m => m.BillingComponent) },
      { path: 'care-sheets',  loadComponent: () => import('./features/secretaire/care-sheets/care-sheets.component').then(m => m.CareSheetsComponent) },
      { path: 'settings',     loadComponent: () => import('./features/secretaire/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'notifications', loadComponent: () => import('./features/patient/notifications/notifications.component').then(m => m.NotificationsComponent) },
    ]
  },

  { path: 'unauthorized', loadComponent: () =>
      import('./features/unauthorized/unauthorized.component')
      .then(m => m.UnauthorizedComponent) },
  { path: '**', redirectTo: '' }
];
