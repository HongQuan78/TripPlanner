import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { login as loginRequest } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
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
    <section className={styles.container}>
      <h1 className={styles.title}>Log in</h1>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className={styles.input}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            className={styles.input}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </div>
        {formError && <p className={styles.formError}>{formError}</p>}
        <button className={styles.submit} type="submit" disabled={pending}>
          Log in
        </button>
      </form>
      <p className={styles.hint}>
        Need an account? <Link to="/register">Register</Link>
      </p>
    </section>
  );
}
