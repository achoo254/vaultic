// Authentication API — register, login, refresh, me, changePassword

import type { $Fetch } from 'ofetch';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  AuthResponse,
  MeResponse,
  ChangePasswordRequest,
} from '@vaultic/types';

/** Auth API client */
export class AuthApi {
  constructor(private client: $Fetch) {}

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.client('/api/v1/auth/register', { method: 'POST', body: data });
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.client('/api/v1/auth/login', { method: 'POST', body: data });
  }

  async refresh(refreshToken: string): Promise<{ access_token: string }> {
    return this.client('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refresh_token: refreshToken },
    });
  }

  async me(): Promise<MeResponse> {
    return this.client('/api/v1/auth/me');
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await this.client('/api/v1/auth/password', { method: 'PUT', body: data });
  }
}
