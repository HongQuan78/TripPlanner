import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resendVerification, verifyEmail } from '../api/auth';
import { ApiError } from '../api/client';
import styles from './AuthForm.module.css';

type VerifyState =
  | { kind: 'idle' }
  | { kind: 'verifying' }
  | { kind: 'verified'; message: string }
  | { kind: 'failed'; message: string };

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
      .catch((error: unknown) => {
        const message =
          error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
        setVerifyState({ kind: 'failed', message });
      });
  }, [token]);

  async function handleResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  if (verifyState.kind === 'verifying') {
    return (
      <section className={styles.container}>
        <h1 className={styles.title}>Verify email</h1>
        <p className={styles.status}>Verifying your email…</p>
      </section>
    );
  }

  if (verifyState.kind === 'verified') {
    return (
      <section className={styles.container}>
        <h1 className={styles.title}>Verify email</h1>
        <p className={styles.success}>{verifyState.message}</p>
        <p className={styles.hint}>
          You can now <Link to="/login">log in</Link>.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.container}>
      <h1 className={styles.title}>Verify email</h1>
      {verifyState.kind === 'failed' && <p className={styles.formError}>{verifyState.message}</p>}
      {resendMessage ? (
        <p className={styles.success}>{resendMessage}</p>
      ) : (
        <form className={styles.form} onSubmit={handleResend} noValidate>
          <p className={styles.hint}>
            Enter your email address and we will send a new verification link.
          </p>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="resend-email">
              Email
            </label>
            <input
              id="resend-email"
              className={styles.input}
              type="email"
              value={resendEmail}
              onChange={(event) => setResendEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
          {resendError && <p className={styles.formError}>{resendError}</p>}
          <button className={styles.submit} type="submit" disabled={resendPending}>
            Resend verification email
          </button>
        </form>
      )}
    </section>
  );
}
