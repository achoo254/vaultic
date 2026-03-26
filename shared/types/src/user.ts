// User and authentication types

export interface User {
  id: string;
  email: string;
}

export interface Argon2Params {
  m: number;
  t: number;
  p: number;
}

export interface RegisterRequest {
  email: string;
  auth_hash: string;
  encrypted_symmetric_key?: string;
  argon2_params?: Argon2Params;
}

export interface RegisterResponse {
  user_id: string;
}

export interface LoginRequest {
  email: string;
  auth_hash: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
}

export interface MeResponse {
  user_id: string;
  email: string;
  encrypted_symmetric_key: string | null;
  argon2_params: Argon2Params;
  created_at: string;
}

export interface ChangePasswordRequest {
  current_auth_hash: string;
  new_auth_hash: string;
  new_encrypted_symmetric_key?: string;
}

export interface AuthState {
  isLocked: boolean;
  isLoggedIn: boolean;
  email: string | null;
  userId: string | null;
}
