import type { ReactNode } from 'react';
import styles from './DestinationDetailsPage.module.css';

export default function InfoRow({
  label,
  value,
  href,
  badge,
  emptyLabel = 'Not available',
}: {
  label: string;
  value: string | null;
  href?: string;
  badge?: ReactNode;
  emptyLabel?: string;
}) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoKey}>{label}</span>
      <span className={styles.infoVal}>
        {value === null ? (
          <span className={styles.na}>{emptyLabel}</span>
        ) : href ? (
          <a className={styles.website} href={href} target="_blank" rel="noopener noreferrer">
            {value}
            <span className={styles.visuallyHidden}> (opens in new tab)</span>
          </a>
        ) : (
          <span className={styles.hoursLine}>
            {value}
            {badge}
          </span>
        )}
      </span>
    </div>
  );
}
