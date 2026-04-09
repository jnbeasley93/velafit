import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import velaImg from '../assets/vela.jpg';
import styles from './Navbar.module.css';

export default function Navbar({ onGetStarted, onLogin }) {
  const { user, isPro, signOut } = useAuth();

  return (
    <nav className={styles.nav}>
      <a href="#" className={styles.logo}>
        <img src={velaImg} alt="Vela" className={styles.avatar} />
        VelaFit
      </a>
      <ul className={styles.links}>
        <li><a href="#how">How It Works</a></li>
        <li><a href="#features">Features</a></li>
        <li><a href="#mind">Mind &amp; Journal</a></li>
        <li><a href="#nutrition">Nutrition</a></li>
        <li><a href="#pricing">Pricing</a></li>
        {user ? (
          <>
            <li>
              <span className={styles.userInfo}>
                {isPro && <span className={styles.proBadge}>PRO</span>}
                {user.email.split('@')[0]}
              </span>
            </li>
            <li>
              <Link to="/settings" style={{ opacity: 1 }}>Settings</Link>
            </li>
            <li>
              <a
                href="#"
                className={styles.cta}
                onClick={(e) => { e.preventDefault(); signOut(); }}
              >
                Sign Out
              </a>
            </li>
          </>
        ) : (
          <>
            <li>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); onLogin?.(); }}
                style={{ opacity: 1 }}
              >
                Sign In
              </a>
            </li>
            <li>
              <a
                href="#"
                className={styles.cta}
                onClick={(e) => { e.preventDefault(); onGetStarted?.(); }}
              >
                Get Started
              </a>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
