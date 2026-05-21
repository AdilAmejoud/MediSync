export type UserRole = 'admin' | 'medecin' | 'patient' | 'secretaire';

export interface User {
  _id: string;
  id?: string; // support both _id and id mapping
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  token?: string;
  twoFactorEnabled?: boolean;
}

export interface AuthResponse {
  success?: boolean;
  token?: string;
  user?: User;
  requiresOTP?: boolean;
  requires2FA?: boolean;
  email?: string;
  message?: string;
}
