import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from '../api/client';
import { AUTH_STORAGE_KEY, AuthProvider, useAuth } from './AuthContext';

const fetchMock = vi.fn();

const session = { id: 1, email: 'user@example.com', role: 'User', token: 'jwt-token' };

function Probe() {
  const { user, token, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <span data-testid="token">{token ?? 'none'}</span>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <button onClick={() => login(session)}>do-login</button>
      <button onClick={() => void logout()}>do-logout</button>
    </div>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
}

function renderProvider(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Probe />
        <LocationProbe />
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  localStorage.clear();
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('AuthProvider', () => {
  it('starts unauthenticated when no session is stored', () => {
    renderProvider();

    expect(screen.getByTestId('authed').textContent).toBe('false');
    expect(screen.getByTestId('email').textContent).toBe('none');
  });

  it('restores the session from localStorage on mount', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));

    renderProvider();

    expect(screen.getByTestId('authed').textContent).toBe('true');
    expect(screen.getByTestId('email').textContent).toBe('user@example.com');
    expect(screen.getByTestId('token').textContent).toBe('jwt-token');
  });

  it('ignores corrupted stored sessions', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, 'not-json');

    renderProvider();

    expect(screen.getByTestId('authed').textContent).toBe('false');
  });

  it('stores the session in state and localStorage on login', () => {
    renderProvider();

    fireEvent.click(screen.getByText('do-login'));

    expect(screen.getByTestId('authed').textContent).toBe('true');
    expect(JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)!)).toEqual(session);
  });

  it('wires the client token provider so requests carry the bearer token', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));

    renderProvider();
    await act(async () => {
      await request('/api/trips');
    });

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer jwt-token');
  });

  it('calls the logout endpoint then clears the session and navigates home', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    fetchMock.mockResolvedValue(new Response('', { status: 200 }));

    renderProvider(['/somewhere']);
    await act(async () => {
      fireEvent.click(screen.getByText('do-logout'));
    });

    expect(fetchMock.mock.calls[0][0]).toContain('/api/auth/logout');
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer jwt-token');
    expect(screen.getByTestId('authed').textContent).toBe('false');
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('location').textContent).toBe('/');
  });

  it('clears the session and navigates home even when the logout call fails', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    renderProvider(['/somewhere']);
    await act(async () => {
      fireEvent.click(screen.getByText('do-logout'));
    });

    expect(screen.getByTestId('authed').textContent).toBe('false');
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('location').textContent).toBe('/');
  });

  it('clears the session and redirects to login with returnTo when a request returns 401', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ title: 'Unauthorized', status: 401 }), { status: 401 }),
    );

    renderProvider(['/trips?view=all']);
    await act(async () => {
      await request('/api/trips').catch(() => {});
    });

    expect(screen.getByTestId('authed').textContent).toBe('false');
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('location').textContent).toBe(
      `/login?returnTo=${encodeURIComponent('/trips?view=all')}`,
    );
  });

  it('does not redirect on 401 when no session exists', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ title: 'Unauthorized', status: 401 }), { status: 401 }),
    );

    renderProvider(['/login']);
    await act(async () => {
      await request('/api/auth/login', { method: 'POST' }).catch(() => {});
    });

    expect(screen.getByTestId('location').textContent).toBe('/login');
  });
});
