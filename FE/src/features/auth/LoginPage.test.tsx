import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/client';
import { AUTH_STORAGE_KEY, AuthProvider } from './AuthContext';
import LoginPage from './LoginPage';

vi.mock('./api', () => ({
  login: vi.fn(),
  logout: vi.fn(),
}));

import { login } from './api';

const loginMock = vi.mocked(login);

const session = { id: 1, email: 'user@example.com', role: 'User', token: 'jwt-token' };

function renderPage(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/trips" element={<p>Trips page</p>} />
          <Route path="/trips/42" element={<p>Trip detail page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
}

beforeEach(() => {
  loginMock.mockReset();
  localStorage.clear();
});

describe('LoginPage', () => {
  it('renders the auth card with wordmark, title, subtitle, and cross-link footer', () => {
    renderPage('/login');

    expect(screen.getByRole('link', { name: 'Trip Planner' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByText('Please enter your details to continue.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/register');
  });

  it('stores the session and navigates to /trips by default on success', async () => {
    loginMock.mockResolvedValue(session);
    renderPage('/login');

    fillAndSubmit('user@example.com', 'password123');

    await waitFor(() => {
      expect(screen.getByText('Trips page')).toBeInTheDocument();
    });
    expect(JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)!)).toEqual(session);
    expect(loginMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
  });

  it('navigates to the returnTo path when present', async () => {
    loginMock.mockResolvedValue(session);
    renderPage(`/login?returnTo=${encodeURIComponent('/trips/42')}`);

    fillAndSubmit('user@example.com', 'password123');

    await waitFor(() => {
      expect(screen.getByText('Trip detail page')).toBeInTheDocument();
    });
  });

  it('shows the generic backend message in an alert banner and preserves the password on 401', async () => {
    loginMock.mockRejectedValue(new ApiError(401, 'Invalid email or password.'));
    renderPage('/login');

    fillAndSubmit('user@example.com', 'wrong-password');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password.');
    });
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(screen.getByLabelText('Password')).toHaveValue('wrong-password');
    expect(screen.getByRole('button', { name: /sign in/i })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('swaps the label to the pending phrase, sets aria-disabled, and ignores re-submits while pending', async () => {
    let resolveLogin: (value: typeof session) => void = () => {};
    loginMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );
    renderPage('/login');

    fillAndSubmit('user@example.com', 'password123');

    const pendingButton = screen.getByRole('button', { name: /signing in…/i });
    expect(pendingButton).toHaveAttribute('aria-disabled', 'true');
    expect(pendingButton).not.toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Signing in…');

    fireEvent.click(pendingButton);
    expect(loginMock).toHaveBeenCalledTimes(1);

    resolveLogin(session);
    await waitFor(() => {
      expect(screen.getByText('Trips page')).toBeInTheDocument();
    });
  });

  it('toggles password visibility without clearing the value', () => {
    renderPage('/login');

    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });
    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(passwordInput).toHaveValue('secret123');

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveValue('secret123');
  });
});
