import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_STORAGE_KEY, AuthProvider } from './AuthContext';
import RequireAuth from './RequireAuth';

vi.mock('./api', () => ({
  logout: vi.fn(),
}));

const session = { id: 1, email: 'user@example.com', role: 'User', token: 'jwt-token' };

function LoginProbe() {
  const location = useLocation();
  return <p data-testid="login-location">{location.pathname + location.search}</p>;
}

function renderGuarded(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route
            path="/trips"
            element={
              <RequireAuth>
                <p>Protected trips</p>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('RequireAuth', () => {
  it('redirects unauthenticated users to /login with returnTo', () => {
    renderGuarded('/trips?view=all');

    expect(screen.queryByText('Protected trips')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-location').textContent).toBe(
      `/login?returnTo=${encodeURIComponent('/trips?view=all')}`,
    );
  });

  it('renders children when authenticated', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));

    renderGuarded('/trips');

    expect(screen.getByText('Protected trips')).toBeInTheDocument();
  });
});
