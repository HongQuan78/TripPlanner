import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span aria-hidden="true">✈️</span>
          TripPlanner
        </Link>
        <nav className={styles.nav}>
          {isAuthenticated ? (
            <>
              <span className={styles.userEmail}>{user?.email}</span>
              <button className={styles.logoutButton} onClick={() => void logout()}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.navLink}>
                Login
              </Link>
              <Link to="/register" className={styles.navLink}>
                Register
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
