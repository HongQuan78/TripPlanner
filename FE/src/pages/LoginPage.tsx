import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { login as loginRequest } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import AuthShell from '../layout/AuthShell';
import { MailIcon } from './authIcons';
import PasswordField from './PasswordField';
import styles from './AuthForm.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    setFormError(null);
    setPending(true);
    try {
      const session = await loginRequest({ email, password });
      login(session);
      const returnTo = searchParams.get('returnTo');
      navigate(returnTo && returnTo.startsWith('/') ? returnTo : '/trips', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
      setPending(false);
    }
  }

  return (
    <AuthShell
      heroHeadline="Welcome Back."
      heroSupport="Your next extraordinary journey begins right where you left off."
      title="Sign In"
      subtitle="Please enter your details to continue."
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-email">
            Email Address
          </label>
          <div className={styles.inputWrap}>
            <MailIcon className={styles.leadIcon} />
            <input
              id="login-email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-password">
            Password
          </label>
          <PasswordField
            id="login-password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        </div>
        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}
        <button
          className={styles.submit}
          type="submit"
          aria-disabled={pending ? 'true' : undefined}
        >
          {pending ? 'Signing in…' : 'Sign In'}
        </button>
        <span className={styles.visuallyHidden} role="status">
          {pending ? 'Signing in…' : ''}
        </span>
      </form>
      <p className={styles.footer}>
        Don't have an account? <Link to="/register">Sign Up</Link>
      </p>
    </AuthShell>
  );
}
