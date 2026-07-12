import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import VerifyEmailPage from './VerifyEmailPage';

vi.mock('../api/auth', () => ({
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
}));

import { resendVerification, verifyEmail } from '../api/auth';

const verifyEmailMock = vi.mocked(verifyEmail);
const resendVerificationMock = vi.mocked(resendVerification);

function renderPage(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <VerifyEmailPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  verifyEmailMock.mockReset();
  resendVerificationMock.mockReset();
});

describe('VerifyEmailPage', () => {
  it('calls the verify endpoint with the token and shows the success message', async () => {
    verifyEmailMock.mockResolvedValue({ message: 'Email verified successfully.' });

    renderPage('/verify-email?token=abc123');

    await waitFor(() => {
      expect(screen.getByText('Email verified successfully.')).toBeInTheDocument();
    });
    expect(verifyEmailMock).toHaveBeenCalledWith('abc123');
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
  });

  it('only fires the verify call once under StrictMode double-mount', async () => {
    verifyEmailMock.mockResolvedValue({ message: 'Email verified successfully.' });

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/verify-email?token=abc123']}>
          <VerifyEmailPage />
        </MemoryRouter>
      </StrictMode>,
    );

    await waitFor(() => {
      expect(screen.getByText('Email verified successfully.')).toBeInTheDocument();
    });
    expect(verifyEmailMock).toHaveBeenCalledTimes(1);
  });

  it('shows the error message and a resend form when verification fails', async () => {
    verifyEmailMock.mockRejectedValue(new ApiError(400, 'Invalid or expired token.'));

    renderPage('/verify-email?token=expired');

    await waitFor(() => {
      expect(screen.getByText('Invalid or expired token.')).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument();
  });

  it('shows the resend form without calling verify when no token is present', () => {
    renderPage('/verify-email');

    expect(verifyEmailMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument();
  });

  it('shows the generic success message after submitting the resend form', async () => {
    resendVerificationMock.mockResolvedValue({
      message: 'If the email exists, a verification link has been sent.',
    });

    renderPage('/verify-email');
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /resend/i }));

    await waitFor(() => {
      expect(
        screen.getByText('If the email exists, a verification link has been sent.'),
      ).toBeInTheDocument();
    });
    expect(resendVerificationMock).toHaveBeenCalledWith({ email: 'user@example.com' });
  });
});
