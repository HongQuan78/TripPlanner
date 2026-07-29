import { HttpClient, httpClient } from '@/shared/api/httpClient';
import type { AuthResponse } from '@/shared/api/models/auth/authResponse';
import type { LoginRequest } from '@/shared/api/models/auth/loginRequest';
import type { MessageResponse } from '@/shared/api/models/common/messageResponse';
import type { RegisterRequest } from '@/shared/api/models/auth/registerRequest';
import type { ResendVerificationRequest } from '@/shared/api/models/auth/resendVerificationRequest';

export class AuthService {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  register(body: RegisterRequest): Promise<MessageResponse> {
    return this.http.request<MessageResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  login(body: LoginRequest): Promise<AuthResponse> {
    return this.http.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  logout(): Promise<void> {
    return this.http.request<void>('/api/auth/logout', { method: 'POST' });
  }

  verifyEmail(token: string): Promise<MessageResponse> {
    return this.http.request<MessageResponse>(
      `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    );
  }

  resendVerification(body: ResendVerificationRequest): Promise<MessageResponse> {
    return this.http.request<MessageResponse>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

export const authService = new AuthService(httpClient);
