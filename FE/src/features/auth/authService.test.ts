import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpClient } from '@/shared/api/httpClient';
import { AuthService } from './authService';

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let service: AuthService;

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  service = new AuthService(new HttpClient(''));
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('register', () => {
  it('posts the credentials to the register endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { message: 'Check your inbox.' }));

    await service.register({ email: 'a@b.c', password: 'Passw0rd!' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/register');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.c', password: 'Passw0rd!' }));
  });

  it('returns the parsed message response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { message: 'Check your inbox.' }));

    const result = await service.register({ email: 'a@b.c', password: 'Passw0rd!' });

    expect(result).toEqual({ message: 'Check your inbox.' });
  });
});

describe('login', () => {
  it('posts the credentials to the login endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await service.login({ email: 'a@b.c', password: 'Passw0rd!' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/login');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.c', password: 'Passw0rd!' }));
  });

  it('returns the parsed session', async () => {
    const session = { id: 1, email: 'a@b.c', role: 'User', token: 'jwt' };
    fetchMock.mockResolvedValue(jsonResponse(200, session));

    const result = await service.login({ email: 'a@b.c', password: 'Passw0rd!' });

    expect(result).toEqual(session);
  });
});

describe('logout', () => {
  it('posts to the logout endpoint without a body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await service.logout();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/logout');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
  });
});

describe('verifyEmail', () => {
  it('calls the verify endpoint with the URL-encoded token', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { message: 'Verified.' }));

    await service.verifyEmail('a b+c/d');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/verify-email?token=a%20b%2Bc%2Fd');
  });
});

describe('resendVerification', () => {
  it('posts the email to the resend endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { message: 'Sent.' }));

    await service.resendVerification({ email: 'a@b.c' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/resend-verification');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.c' }));
  });
});
