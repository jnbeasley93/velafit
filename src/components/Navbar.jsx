import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import velaImg from '../assets/vela.jpg';
import styles from './Navbar.module.css';

function scrollToHash(hash, navigate, pathname) {
  if (pathname === '/') {
    const el = document.getElementById(hash);
    if (el) { el.scrollIntoView({ behavior: 'smooth' }); return; }
  }
  navigate('/#' + hash);
}

export default function Navbar({ onGetStarted, onLogin }) {
  const { user, isPro, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleHash = (hash) => (e) => {
    e.preventDefault();
    scrollToHash(hash, navigate, location.pathname);
  };

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        <img src={velaImg} alt="Vela" className={styles.avatar} />
        VelaFit
      </Link>

      {user ? (
        <ul className={styles.centerLinks}>
          <li><a href="#mind" onClick={handleHash('mind')}>Mind &amp; Journal</a></li>
          <li><a href="#nutrition" onClick={handleHash('nutrition')}>Nutrition</a></li>
          <li><Link to="/history">History</Link></li>
          <li><Link to="/settings">Settings</Link></li>
          {!isPro && (
            <li>
              <a
                href="#pricing"
                className={styles.upgradeLink}
                onClick={handleHash('pricing')}
              >
                Upgrade
              </a>
            </li>
          )}
        </ul>
      ) : (
        <ul className={styles.centerLinks}>
          <li><a href="#how" onClick={handleHash('how')}>How It Works</a></li>
          <li><a href="#features" onClick={handleHash('features')}>Features</a></li>
          <li><a href="#mind" onClick={handleHash('mind')}>Mind &amp; Journal</a></li>
          <li><a href="#nutrition" onClick={handleHash('nutrition')}>Nutrition</a></li>
          <li><a href="#pricing" onClick={handleHash('pricing')}>Pricing</a></li>
        </ul>
      )}

      <div className={styles.right}>
        {user ? (
          <>
            <span className={styles.userInfo}>
              {isPro && <span className={styles.proBadge}>PRO</span>}
              {user.email.split('@')[0]}
            </span>
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
