import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import RegisterPage from './RegisterPage';

vi.mock('../api/auth', () => ({
  register: vi.fn(),
}));

import { register } from '../api/auth';

const registerMock = vi.mocked(register);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <RegisterPage />
    </MemoryRouter>,
  );
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /register/i }));
}

beforeEach(() => {
  registerMock.mockReset();
});

describe('RegisterPage', () => {
  it('shows a validation message for an invalid email and does not call the api', () => {
    renderPage();

    fillAndSubmit('not-an-email', 'password123');

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('shows a validation message for a short password and does not call the api', () => {
    renderPage();

    fillAndSubmit('user@example.com', 'short');

    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('replaces the form with the returned message on success', async () => {
    registerMock.mockResolvedValue({ message: 'Check your inbox to verify your account.' });
    renderPage();

    fillAndSubmit('user@example.com', 'password123');

    await waitFor(() => {
      expect(screen.getByText('Check your inbox to verify your account.')).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
    expect(registerMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(localStorage.getItem('tripplanner.auth')).toBeNull();
  });

  it('disables the submit button while the request is pending', async () => {
    let resolveRegister: (value: { message: string }) => void = () => {};
    registerMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRegister = resolve;
        }),
    );
    renderPage();

    fillAndSubmit('user@example.com', 'password123');

    expect(screen.getByRole('button', { name: /register/i })).toBeDisabled();
    resolveRegister({ message: 'ok' });
    await waitFor(() => {
      expect(screen.getByText('ok')).toBeInTheDocument();
    });
  });

  it('shows the api error message when registration fails', async () => {
    registerMock.mockRejectedValue(new ApiError(400, 'Email is invalid.'));
    renderPage();

    fillAndSubmit('user@example.com', 'password123');

    await waitFor(() => {
      expect(screen.getByText('Email is invalid.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /register/i })).toBeEnabled();
  });
});
