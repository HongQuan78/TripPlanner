import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resendVerification, verifyEmail } from '../api/auth';
import { ApiError } from '../api/client';
import AuthShell from '../layout/AuthShell';
import { MailIcon } from './authIcons';
import styles from './AuthForm.module.css';

const VERIFY_FAILED_MESSAGE =
  "That link didn't work. It may have expired — we can send you a new one.";

type VerifyState =
  | { kind: 'idle' }
  | { kind: 'verifying' }
  | { kind: 'verified'; message: string }
  | { kind: 'failed' };

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [verifyState, setVerifyState] = useState<VerifyState>(
    token ? { kind: 'verifying' } : { kind: 'idle' },
  );
  const verifyFired = useRef(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || verifyFired.current) {
      return;
    }
    verifyFired.current = true;
    verifyEmail(token)
      .then((response) => {
        setVerifyState({ kind: 'verified', message: response.message });
      })
      .catch(() => {
        setVerifyState({ kind: 'failed' });
      });
  }, [token]);

  async function handleResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resendPending) {
      return;
    }
    setResendError(null);
    setResendPending(true);
    try {
      const response = await resendVerification({ email: resendEmail });
      setResendMessage(response.message);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
      setResendError(message);
    } finally {
      setResendPending(false);
    }
  }

  return (
    <AuthShell
      heroHeadline="Almost There."
      heroSupport="One click stands between you and your first itinerary."
      title="Verify email"
    >
      {(verifyState.kind === 'verifying' || verifyState.kind === 'verified') && (
        <>
          <div role="status" aria-live="polite">
            {verifyState.kind === 'verifying' ? (
              <p className={styles.status}>Verifying your email…</p>
            ) : (
              <p className={styles.success}>{verifyState.message}</p>
            )}
          </div>
          {verifyState.kind === 'verified' && (
            <p className={styles.footer}>
              You can now <Link to="/login">log in</Link>.
            </p>
          )}
        </>
      )}
      {(verifyState.kind === 'idle' || verifyState.kind === 'failed') && (
        <div className={styles.form}>
          {verifyState.kind === 'failed' && (
            <p className={styles.formError} role="alert">
              {VERIFY_FAILED_MESSAGE}
            </p>
          )}
          {resendMessage ? (
            <p className={styles.success} aria-live="polite">
              {resendMessage}
            </p>
          ) : (
            <form className={styles.form} onSubmit={handleResend} noValidate>
              {verifyState.kind === 'idle' && (
                <p className={styles.hint}>
                  Enter your email address and we will send a new verification link.
                </p>
              )}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="resend-email">
                  Email Address
                </label>
                <div className={styles.inputWrap}>
                  <MailIcon className={styles.leadIcon} />
                  <input
                    id="resend-email"
                    className={styles.input}
                    type="email"
                    value={resendEmail}
                    onChange={(event) => setResendEmail(event.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>
              {resendError && (
                <p className={styles.formError} role="alert">
                  {resendError}
                </p>
              )}
              <button
                className={styles.submit}
                type="submit"
                aria-disabled={resendPending ? 'true' : undefined}
              >
                {resendPending ? 'Sending…' : 'Resend Verification Email'}
              </button>
              <span className={styles.visuallyHidden} role="status">
                {resendPending ? 'Sending…' : ''}
              </span>
            </form>
          )}
        </div>
      )}
    </AuthShell>
  );
}
