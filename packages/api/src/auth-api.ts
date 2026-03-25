// Authentication API — register, login, refresh

import type { $Fetch } from 'ofetch';
import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
} from '@vaultic/types';

/** Auth API client for register, login, token refresh */
export class AuthApi {
  constructor(private client: $Fetch) {}

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.client('/api/auth/register', { method: 'POST', body: data });
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.client('/api/auth/login', { method: 'POST', body: data });
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    return this.client('/api/auth/refresh', {
      method: 'POST',
      body: { refresh_token: refreshToken },
    });
  }
}
