import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import velaImg from '../assets/vela.jpg';
import styles from './Navbar.module.css';

export default function Navbar({ onGetStarted, onLogin }) {
  const { user, isPro, signOut } = useAuth();

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        <img src={velaImg} alt="Vela" className={styles.avatar} />
        VelaFit
      </Link>

      {!user && (
        <ul className={styles.centerLinks}>
          <li><a href="#how">How It Works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#mind">Mind &amp; Journal</a></li>
          <li><a href="#nutrition">Nutrition</a></li>
          <li><a href="#pricing">Pricing</a></li>
        </ul>
      )}

      <div className={styles.right}>
        {user ? (
          <>
            <span className={styles.userInfo}>
              {isPro && <span className={styles.proBadge}>PRO</span>}
              {user.email.split('@')[0]}
            </span>
            <Link to="/history" className={styles.navLink}>History</Link>
            <Link to="/settings" className={styles.navLink}>Settings</Link>
            <button className={styles.signOutBtn} onClick={signOut}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <a
              href="#"
              className={styles.navLink}
              onClick={(e) => { e.preventDefault(); onLogin?.(); }}
            >
              Sign In
            </a>
            <a
              href="#"
              className={styles.cta}
              onClick={(e) => { e.preventDefault(); onGetStarted?.(); }}
            >
              Get Started
            </a>
          </>
        )}
      </div>
    </nav>
  );
}
