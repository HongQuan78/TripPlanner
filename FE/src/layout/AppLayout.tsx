import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  return (
    <div className={styles.app}>
      <div className={styles.blobs} aria-hidden="true">
        <div className={styles.blobOne} />
        <div className={styles.blobTwo} />
      </div>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span aria-hidden="true">✈️</span>
          TripPlanner
        </Link>
        <nav className={styles.nav}>
          {isAuthenticated ? (
            <>
              <Link to="/trips" className={styles.navLink}>
                My Trips
              </Link>
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
        <div key={location.pathname} className={styles.routeTransition}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
