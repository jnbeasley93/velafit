import velaImg from '../assets/vela.jpg';
import styles from './Navbar.module.css';

export default function Navbar({ onGetStarted }) {
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
        <li>
          <a
            href="#"
            className={styles.cta}
            onClick={(e) => { e.preventDefault(); onGetStarted?.(); }}
          >
            Get Started
          </a>
        </li>
      </ul>
    </nav>
  );
}
