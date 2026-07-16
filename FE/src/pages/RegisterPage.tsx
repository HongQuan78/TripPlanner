import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../api/auth';
import { ApiError } from '../api/client';
import AuthShell from '../layout/AuthShell';
import { MailIcon } from './authIcons';
import PasswordField from './PasswordField';
import styles from './AuthForm.module.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HERO_HEADLINE = 'Begin Somewhere New.';
const HERO_SUPPORT = "One account, every itinerary — plan the trips you've been putting off.";

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    const nextEmailError = EMAIL_PATTERN.test(email) ? null : 'Enter a valid email address.';
    const nextPasswordError =
      password.length >= 8 ? null : 'Password must be at least 8 characters.';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setFormError(null);
    if (nextEmailError || nextPasswordError) {
      if (nextEmailError) {
        emailRef.current?.focus();
      } else {
        passwordRef.current?.focus();
      }
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
      <AuthShell heroHeadline={HERO_HEADLINE} heroSupport={HERO_SUPPORT} title="Check your inbox.">
        <p className={styles.success} aria-live="polite">
          {successMessage}
        </p>
        <p className={styles.footer}>
          Already verified? <Link to="/login">Log in</Link>.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      heroHeadline={HERO_HEADLINE}
      heroSupport={HERO_SUPPORT}
      title="Create your account"
      subtitle="Please enter your details to continue."
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="register-email">
            Email Address
          </label>
          <div className={styles.inputWrap}>
            <MailIcon className={styles.leadIcon} />
            <input
              id="register-email"
              ref={emailRef}
              className={styles.input}
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError(null);
              }}
              autoComplete="email"
              aria-describedby={emailError ? 'register-email-error' : undefined}
              aria-invalid={emailError ? true : undefined}
            />
          </div>
          {emailError && (
            <p className={styles.fieldError} id="register-email-error">
              {emailError}
            </p>
          )}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="register-password">
            Password
          </label>
          <PasswordField
            id="register-password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setPasswordError(null);
            }}
            autoComplete="new-password"
            describedBy="register-password-rules"
            invalid={Boolean(passwordError)}
            inputRef={passwordRef}
          />
          {passwordError ? (
            <p className={styles.fieldError} id="register-password-rules">
              {passwordError}
            </p>
          ) : (
            <p className={styles.helper} id="register-password-rules">
              At least 8 characters.
            </p>
          )}
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
          {pending ? 'Creating your account…' : 'Create Account'}
        </button>
        <span className={styles.visuallyHidden} role="status">
          {pending ? 'Creating your account…' : ''}
        </span>
      </form>
      <p className={styles.footer}>
        Already have an account? <Link to="/login">Sign In</Link>
      </p>
    </AuthShell>
  );
}
