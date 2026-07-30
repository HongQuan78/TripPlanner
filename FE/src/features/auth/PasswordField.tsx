import { useState } from 'react';
import type { Ref } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon } from './authIcons';
import styles from './AuthForm.module.css';

interface PasswordFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  describedBy?: string;
  invalid?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}

export default function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  describedBy,
  invalid,
  inputRef,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`${styles.inputWrap} ${styles.hasToggle}`}>
      <LockIcon className={styles.leadIcon} />
      <input
        id={id}
        ref={inputRef}
        className={styles.input}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
      />
      <button
        className={styles.toggle}
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
