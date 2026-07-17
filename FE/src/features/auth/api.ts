import { request } from '@/shared/api/client';
import type {
  AuthResponse,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ResendVerificationRequest,
} from '@/shared/api/types';

export function register(body: RegisterRequest): Promise<MessageResponse> {
  return request<MessageResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function login(body: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function logout(): Promise<void> {
  return request<void>('/api/auth/logout', { method: 'POST' });
}

export function verifyEmail(token: string): Promise<MessageResponse> {
  return request<MessageResponse>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export function resendVerification(body: ResendVerificationRequest): Promise<MessageResponse> {
  return request<MessageResponse>('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
