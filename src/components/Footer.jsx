import velaImg from '../assets/vela.jpg';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div>
        <div className={styles.logo}>
          <img src={velaImg} alt="Vela" className={styles.avatar} />
          VelaFit
        </div>
        <div className={styles.tagline}>Fitness that fits your life.</div>
      </div>
      <ul className={styles.links}>
        <li><a href="#how">How It Works</a></li>
        <li><a href="#features">Features</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><a href="#">Privacy</a></li>
        <li><a href="#">Terms</a></li>
      </ul>
      <div className={styles.copy}>&copy; 2025 VelaFit. All rights reserved.</div>
    </footer>
  );
}
