import { Link } from 'react-router-dom';
import velaImg from '../assets/vela.jpg';
import styles from './About.module.css';

function AboutBody() {
  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Why VelaFit exists.</h2>
        <p className={styles.body}>
          I spent years working in the fitness industry with a degree in
          Kinesiology and a minor in Nutrition. And in all that time, the
          thing that frustrated me most wasn't a lack of information — it
          was watching people give up.
        </p>
        <p className={styles.body}>
          Not because they were lazy. Because the programs they were
          following weren't built for their life.
        </p>
        <p className={styles.body}>
          Every app, every plan, every trainer assumed you had unlimited
          time, access to a gym, and a perfectly consistent schedule. Real
          life doesn't work that way. You miss a day. Work gets crazy. The
          kids get sick. And suddenly the app that was supposed to help
          you feel better just makes you feel like you've already failed.
        </p>
        <p className={styles.body}>
          VelaFit was built differently. We meet you where you are — your
          schedule, your equipment, your home, your goals. A 15-minute
          session at home counts. A journal entry at midnight counts. A
          Sudoku puzzle between meetings counts. Progress isn't linear,
          and it doesn't have to be perfect to be real.
        </p>
      </section>

      <hr className={styles.divider} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Why a frog?</h2>
        <blockquote className={styles.pullQuote}>
          "Frogs can't jump backwards."
        </blockquote>
        <p className={styles.body}>
          A frog starts life as a tadpole — confined to water — and
          transforms into a creature that can thrive on land and in
          water, leaping forward in short powerful bursts. That's exactly
          the kind of progress we're after here. Not giant leaps.
          Consistent forward motion.
        </p>
        <p className={styles.body}>
          Miss a day? That's fine. You can't go backwards. Just pick it
          up and keep moving.
        </p>
        <p className={styles.body}>
          In many traditions, the frog is a symbol of transformation,
          rebirth, and emotional healing. That felt right. Because if you
          stick with this — not just the workouts, but the journaling,
          the breathing, the mind games, the nutrition — you won't just
          get stronger. You'll feel different. That's the real goal.
        </p>
      </section>

      <hr className={styles.divider} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>A note on the mind.</h2>
        <p className={styles.body}>
          I have seen firsthand what Alzheimer's and Dementia does to people
          and their families — and it changed how I think about health. The brain needs training
          just as much as the body does. That's why Sharpen exists — not
          as a gimmick, but as a genuine daily practice. Five minutes of
          focused cognitive work every day compounds over time, just like
          physical training does.
        </p>
      </section>

      <hr className={styles.divider} />

      <section className={styles.statementSection}>
        <h2 className={styles.statement}>
          This app is for you if life has gotten too busy to take care of
          yourself.
        </h2>
        <p className={styles.statementSub}>
          Even if you can't work out today — a journal entry, a breathing
          exercise, or a challenging puzzle can still shift your mood.
          Health is more than the gym. VelaFit is proof of that.
        </p>
      </section>

      <hr className={styles.divider} />

      <section className={styles.founderCard}>
        <h3 className={styles.founderTitle}>Built by someone who gets it.</h3>
        <p className={styles.founderBody}>
          Kinesiology degree. Minor in Nutrition. Years in the fitness
          industry. And yes — someone who has also gotten frustrated with
          fitness apps and quit. VelaFit is the app I wished existed.
        </p>
      </section>
    </>
  );
}

export function AboutSections() {
  return (
    <section id="about" className={styles.marketingWrap}>
      <div className={styles.marketingHeader}>
        <span className={styles.eyebrow}>Our Story</span>
      </div>
      <div className={styles.container}>
        <AboutBody />
      </div>
    </section>
  );
}

export default function About() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <img src={velaImg} alt="Vela the frog" className={styles.mascot} />
        <h1 className={styles.heroTitle}>VelaFit</h1>
        <p className={styles.tagline}>Fitness that fits your life.</p>
      </section>

      <div className={styles.container}>
        <Link to="/" className={styles.backLink}>← Back to home</Link>
        <AboutBody />
      </div>
    </div>
  );
}
