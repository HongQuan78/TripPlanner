import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            <img src="/android-chrome-192x192.png" alt="" className={styles.brandMark} />
            <span className={styles.brandName}>TripPlanner</span>
          </Link>
          <nav className={styles.nav} aria-label="Main">
            {isAuthenticated ? (
              <>
                <NavLink to="/trips" className={navLinkClass}>
                  My Trips
                </NavLink>
                <span className={styles.divider} aria-hidden="true" />
                <span className={styles.user}>
                  <span className={styles.avatar} aria-hidden="true">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                  <span className={styles.userEmail}>{user?.email}</span>
                </span>
                <button className={styles.logoutButton} onClick={() => void logout()}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Login
                </NavLink>
                <Link to="/register" className={styles.registerButton}>
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className={styles.content}>
        <div key={location.pathname} className={styles.routeTransition}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
