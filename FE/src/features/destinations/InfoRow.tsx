import type { ReactNode } from 'react';
import { isSafeHttpUrl } from '@/shared/lib/isSafeHttpUrl';
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
  const isEmpty = value === null || value.trim().length === 0;
  const safeHref = href !== undefined && isSafeHttpUrl(href) ? href : undefined;

  return (
    <div className={styles.infoRow}>
      <span className={styles.infoKey}>{label}</span>
      <span className={styles.infoVal}>
        {isEmpty ? (
          <span className={styles.na}>{emptyLabel}</span>
        ) : safeHref !== undefined ? (
          <a className={styles.website} href={safeHref} target="_blank" rel="noopener noreferrer">
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
