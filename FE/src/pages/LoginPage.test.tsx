import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { AUTH_STORAGE_KEY, AuthProvider } from '../auth/AuthContext';
import LoginPage from './LoginPage';

vi.mock('../api/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
}));

import { login } from '../api/auth';

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
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /log in/i }));
}

beforeEach(() => {
  loginMock.mockReset();
  localStorage.clear();
});

describe('LoginPage', () => {
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

  it('shows the generic backend message on 401', async () => {
    loginMock.mockRejectedValue(new ApiError(401, 'Invalid email or password.'));
    renderPage('/login');

    fillAndSubmit('user@example.com', 'wrong-password');

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    });
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(screen.getByRole('button', { name: /log in/i })).toBeEnabled();
  });

  it('disables the submit button while the request is pending', async () => {
    let resolveLogin: (value: typeof session) => void = () => {};
    loginMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );
    renderPage('/login');

    fillAndSubmit('user@example.com', 'password123');

    expect(screen.getByRole('button', { name: /log in/i })).toBeDisabled();
    resolveLogin(session);
    await waitFor(() => {
      expect(screen.getByText('Trips page')).toBeInTheDocument();
    });
  });
});
