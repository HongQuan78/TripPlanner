import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../api/auth';
import { ApiError } from '../api/client';
import styles from './AuthForm.module.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextEmailError = EMAIL_PATTERN.test(email) ? null : 'Enter a valid email address.';
    const nextPasswordError =
      password.length >= 8 ? null : 'Password must be at least 8 characters.';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setFormError(null);
    if (nextEmailError || nextPasswordError) {
      return;
    }

    setPending(true);
    try {
      const response = await register({ email, password });
      setSuccessMessage(response.message);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
      setPending(false);
    }
  }

  if (successMessage) {
    return (
      <section className={styles.container}>
        <h1 className={styles.title}>Registration received</h1>
        <p className={styles.success}>{successMessage}</p>
        <p className={styles.hint}>
          Already verified? <Link to="/login">Log in</Link>
        </p>
      </section>
    );
  }

  return (
    <section className={styles.container}>
      <h1 className={styles.title}>Register</h1>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="register-email">
            Email
          </label>
          <input
            id="register-email"
            className={styles.input}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
          {emailError && <p className={styles.fieldError}>{emailError}</p>}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="register-password">
            Password
          </label>
          <input
            id="register-password"
            className={styles.input}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
          {passwordError && <p className={styles.fieldError}>{passwordError}</p>}
        </div>
        {formError && <p className={styles.formError}>{formError}</p>}
        <button className={styles.submit} type="submit" disabled={pending}>
          Register
        </button>
      </form>
      <p className={styles.hint}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  );
}
