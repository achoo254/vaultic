// User and authentication types

export interface User {
  id: string;
  email: string;
}

export interface RegisterRequest {
  email: string;
  auth_hash: string;
  salt: string;
}

export interface LoginRequest {
  email: string;
  auth_hash: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
}
