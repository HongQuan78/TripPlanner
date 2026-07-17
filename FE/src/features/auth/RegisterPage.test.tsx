import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/client';
import RegisterPage from './RegisterPage';

vi.mock('./api', () => ({
  register: vi.fn(),
}));

import { register } from './api';

const registerMock = vi.mocked(register);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <RegisterPage />
    </MemoryRouter>,
  );
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));
}

beforeEach(() => {
  registerMock.mockReset();
});

describe('RegisterPage', () => {
  it('renders the auth card with title, persistent password helper, and cross-link footer', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByText('At least 8 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 8 characters.');
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login');
  });

  it('shows a validation message for an invalid email and does not call the api', () => {
    renderPage();

    fillAndSubmit('not-an-email', 'password123');

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email Address')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
    expect(screen.getByLabelText('Email Address')).toHaveFocus();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('replaces the helper with the password error, focuses the field, and does not call the api', () => {
    renderPage();

    fillAndSubmit('user@example.com', 'short');

    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(screen.queryByText('At least 8 characters.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password')).toHaveFocus();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('shows both field errors at once and focuses the first invalid field', () => {
    renderPage();

    fillAndSubmit('not-an-email', 'short');

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toHaveFocus();
  });

  it('clears a field error when the user edits that field', () => {
    renderPage();

    fillAndSubmit('not-an-email', 'short');

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'user@example.com' },
    });
    expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    expect(screen.queryByText('Password must be at least 8 characters.')).not.toBeInTheDocument();
    expect(screen.getByText('At least 8 characters.')).toBeInTheDocument();
  });

  it('replaces the form with the returned message under "Check your inbox." on success', async () => {
    registerMock.mockResolvedValue({ message: 'Check your inbox to verify your account.' });
    renderPage();

    fillAndSubmit('user@example.com', 'password123');

    await waitFor(() => {
      expect(screen.getByText('Check your inbox to verify your account.')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Check your inbox.' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
    expect(registerMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(localStorage.getItem('tripplanner.auth')).toBeNull();
  });

  it('swaps the label to the pending phrase, sets aria-disabled, and ignores re-submits while pending', async () => {
    let resolveRegister: (value: { message: string }) => void = () => {};
    registerMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRegister = resolve;
        }),
    );
    renderPage();

    fillAndSubmit('user@example.com', 'password123');

    const pendingButton = screen.getByRole('button', { name: /creating your account…/i });
    expect(pendingButton).toHaveAttribute('aria-disabled', 'true');
    expect(pendingButton).not.toBeDisabled();

    fireEvent.click(pendingButton);
    expect(registerMock).toHaveBeenCalledTimes(1);

    resolveRegister({ message: 'ok' });
    await waitFor(() => {
      expect(screen.getByText('ok')).toBeInTheDocument();
    });
  });

  it('shows the api error message in an alert banner when registration fails', async () => {
    registerMock.mockRejectedValue(new ApiError(400, 'Email is invalid.'));
    renderPage();

    fillAndSubmit('user@example.com', 'password123');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Email is invalid.');
    });
    expect(screen.getByRole('button', { name: /create account/i })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('toggles password visibility without clearing the value', () => {
    renderPage();

    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(passwordInput).toHaveValue('secret123');
  });
});
