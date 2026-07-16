import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './AuthShell.module.css';

interface AuthShellProps {
  heroHeadline: string;
  heroSupport: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AuthShell({
  heroHeadline,
  heroSupport,
  title,
  subtitle,
  children,
}: AuthShellProps) {
  return (
    <div className={styles.screen}>
      <div className={styles.hero} aria-hidden="true">
        <div className={styles.heroCopy}>
          <div className={styles.heroHeadline}>{heroHeadline}</div>
          <p className={styles.heroSupport}>{heroSupport}</p>
        </div>
      </div>
      <div className={styles.formSide}>
        <section className={styles.card}>
          <p className={styles.wordmark}>
            <Link to="/">Trip Planner</Link>
          </p>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}
