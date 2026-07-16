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
  it('announces verifying inside a status region, then resolves it to the success message in place', async () => {
    let resolveVerify: (value: { message: string }) => void = () => {};
    verifyEmailMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveVerify = resolve;
        }),
    );

    renderPage('/verify-email?token=abc123');

    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toHaveTextContent('Verifying your email…');

    resolveVerify({ message: 'Email verified successfully.' });
    await waitFor(() => {
      expect(screen.getByText('Email verified successfully.')).toBeInTheDocument();
    });
    expect(screen.getByRole('status')).toBe(statusRegion);
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

  it('shows the recovery copy in an alert banner and a resend form when verification fails', async () => {
    verifyEmailMock.mockRejectedValue(new ApiError(400, 'Invalid or expired token.'));

    renderPage('/verify-email?token=expired');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        "That link didn't work. It may have expired — we can send you a new one.",
      );
    });
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument();
  });

  it('shows the resend form with the hint without calling verify when no token is present', () => {
    renderPage('/verify-email');

    expect(verifyEmailMock).not.toHaveBeenCalled();
    expect(
      screen.getByText('Enter your email address and we will send a new verification link.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument();
  });

  it('replaces the resend form with the generic success message after submitting', async () => {
    resendVerificationMock.mockResolvedValue({
      message: 'If the email exists, a verification link has been sent.',
    });

    renderPage('/verify-email');
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /resend/i }));

    await waitFor(() => {
      expect(
        screen.getByText('If the email exists, a verification link has been sent.'),
      ).toBeInTheDocument();
    });
    expect(screen.queryByLabelText('Email Address')).not.toBeInTheDocument();
    expect(resendVerificationMock).toHaveBeenCalledWith({ email: 'user@example.com' });
  });

  it('swaps the resend label to the pending phrase with aria-disabled and ignores re-submits', async () => {
    let resolveResend: (value: { message: string }) => void = () => {};
    resendVerificationMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveResend = resolve;
        }),
    );

    renderPage('/verify-email');
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /resend/i }));

    const pendingButton = screen.getByRole('button', { name: /sending…/i });
    expect(pendingButton).toHaveAttribute('aria-disabled', 'true');
    expect(pendingButton).not.toBeDisabled();

    fireEvent.click(pendingButton);
    expect(resendVerificationMock).toHaveBeenCalledTimes(1);

    resolveResend({ message: 'ok' });
    await waitFor(() => {
      expect(screen.getByText('ok')).toBeInTheDocument();
    });
  });

  it('shows the resend error above the intact form with the typed email preserved', async () => {
    resendVerificationMock.mockRejectedValue(new ApiError(500, 'Something went wrong.'));

    renderPage('/verify-email');
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /resend/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.');
    });
    expect(screen.getByLabelText('Email Address')).toHaveValue('user@example.com');
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument();
  });
});
