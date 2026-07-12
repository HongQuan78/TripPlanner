import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_STORAGE_KEY, AuthProvider } from '../auth/AuthContext';
import AppLayout from './AppLayout';

vi.mock('../api/auth', () => ({
  logout: vi.fn(),
}));

import { logout } from '../api/auth';

const logoutMock = vi.mocked(logout);

const session = { id: 1, email: 'user@example.com', role: 'User', token: 'jwt-token' };

function HomeProbe() {
  const location = useLocation();
  return <p data-testid="home-location">{location.pathname}</p>;
}

function renderLayout(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomeProbe />} />
            <Route path="/somewhere" element={<p>Somewhere</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  logoutMock.mockReset();
  localStorage.clear();
});

describe('AppLayout header', () => {
  it('shows Login and Register links when logged out', () => {
    renderLayout();

    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
  });

  it('shows the logged-in email and a Logout button when authenticated', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));

    renderLayout();

    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Register' })).not.toBeInTheDocument();
  });

  it('calls the logout endpoint, clears the session, and navigates home on Logout', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    logoutMock.mockResolvedValue(undefined);

    renderLayout('/somewhere');
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => {
      expect(screen.getByTestId('home-location').textContent).toBe('/');
    });
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
  });

  it('still clears the session and navigates home when the logout call fails', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    logoutMock.mockRejectedValue(new Error('network down'));

    renderLayout('/somewhere');
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => {
      expect(screen.getByTestId('home-location').textContent).toBe('/');
    });
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
