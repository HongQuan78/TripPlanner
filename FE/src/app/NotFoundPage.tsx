import { Link } from 'react-router-dom';
import styles from '@/shared/ui/PageState.module.css';

export default function NotFoundPage() {
  return (
    <section className={styles.state}>
      <span className={styles.emoji} aria-hidden="true">
        🙈
      </span>
      <h1 className={styles.heading}>Page not found</h1>
      <p className={styles.text}>The page you are looking for does not exist.</p>
      <Link to="/" className={styles.action}>
        Go back home
      </Link>
    </section>
  );
}
