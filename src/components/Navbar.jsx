import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import velaImg from '../assets/vela.jpg';
import styles from './Navbar.module.css';

function scrollToHash(hash, navigate, pathname) {
  // If already on a page with the section, scroll directly
  if (pathname === '/' || pathname === '/home') {
    const el = document.getElementById(hash);
    if (el) { el.scrollIntoView({ behavior: 'smooth' }); return; }
  }
  // Navigate to the marketing page with hash
  navigate('/home#' + hash);
}

export default function Navbar({ onGetStarted, onLogin }) {
  const { user, isPro, displayName, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  // Safety net: close the mobile menu on any route change (render-time state
  // adjustment instead of an effect — avoids a cascading re-render).
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMenuOpen(false);
  }

  const handleHash = (hash) => (e) => {
    e.preventDefault();
    closeMenu();
    scrollToHash(hash, navigate, location.pathname);
  };

  return (
    <nav className={styles.nav}>
      <Link to={user ? '/dashboard' : '/'} className={styles.logo}>
        <img src={velaImg} alt="Vela" className={styles.avatar} />
        VelaFit
      </Link>

      {user ? (
        <ul
          className={`${styles.centerLinks} ${menuOpen ? styles.open : ''}`}
          id="nav-menu"
        >
          <li><Link to="/dashboard" onClick={closeMenu}>🏋️ Move</Link></li>
          <li><Link to="/sharpen" onClick={closeMenu}>🧩 Sharpen</Link></li>
          <li><Link to="/settle" onClick={closeMenu}>🧘 Settle</Link></li>
          <li><Link to="/journal" onClick={closeMenu}>📓 Journal</Link></li>
          <li><Link to="/learn" onClick={closeMenu}>📚 Learn</Link></li>
          <li><Link to="/about" onClick={closeMenu}>Our Story</Link></li>
          <li><Link to="/history" onClick={closeMenu}>History</Link></li>
          <li><Link to="/settings" onClick={closeMenu}>Settings</Link></li>
          {!isPro && (
            <li>
              <a
                href="/#pricing"
                className={styles.upgradeLink}
                onClick={handleHash('pricing')}
              >
                Upgrade
              </a>
            </li>
          )}
        </ul>
      ) : (
        <ul
          className={`${styles.centerLinks} ${menuOpen ? styles.open : ''}`}
          id="nav-menu"
        >
          <li><a href="#how" onClick={handleHash('how')}>How It Works</a></li>
          <li><a href="#features" onClick={handleHash('features')}>Features</a></li>
          <li><a href="#mind" onClick={handleHash('mind')}>Mind &amp; Journal</a></li>
          <li><a href="#nutrition" onClick={handleHash('nutrition')}>Nutrition</a></li>
          <li><a href="#pricing" onClick={handleHash('pricing')}>Pricing</a></li>
          <li><Link to="/about" onClick={closeMenu}>Our Story</Link></li>
        </ul>
      )}

      <div className={styles.right}>
        {user ? (
          <>
            <span className={styles.userInfo}>
              {isPro && <span className={styles.proBadge}>PRO</span>}
              {displayName || user.email.split('@')[0]}
            </span>
            <button
              className={styles.themeBtn}
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
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
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="nav-menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  );
}
