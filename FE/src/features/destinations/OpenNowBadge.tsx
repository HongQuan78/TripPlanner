import type { OpenNowResult } from './openNow';
import styles from './DestinationDetailsPage.module.css';

export default function OpenNowBadge({ result }: { result: OpenNowResult | null }) {
  if (result === null) {
    return null;
  }
  if (result.status === 'open') {
    return (
      <span className={styles.openBadge}>
        <span className={styles.openDot} aria-hidden="true" />
        Open now
      </span>
    );
  }
  return <span className={styles.closedBadge}>Closed</span>;
}
