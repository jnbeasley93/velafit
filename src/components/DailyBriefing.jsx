import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './DailyBriefing.module.css';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getTimeBreakdown(totalMins, noMindGames) {
  if (totalMins <= 15) {
    if (noMindGames) return { workout: 15, journal: 0, mindGame: 0 };
    return { workout: 10, journal: 0, mindGame: 5 };
  }
  if (totalMins <= 30) {
    if (noMindGames) return { workout: 25, journal: 5, mindGame: 0 };
    return { workout: 20, journal: 7, mindGame: 3 };
  }
  if (totalMins <= 45) {
    if (noMindGames) return { workout: 35, journal: 10, mindGame: 0 };
    return { workout: 30, journal: 10, mindGame: 5 };
  }
  if (noMindGames) return { workout: 45, journal: 15, mindGame: 0 };
  return { workout: 40, journal: 12, mindGame: 8 };
}

const staticPlanItems = [
  {
    dot: 'dot',
    text: 'Full-body strength session — priority blocks first. If time runs short, complete the first two and continue tomorrow.',
    duration: '45 min',
  },
  {
    dot: 'dotGold',
    text: "5-minute brain break — today's crossword is queued and ready.",
    duration: '5 min',
  },
  {
    dot: 'dotGold',
    text: 'Journal prompt: What got in the way this week — and what adjusted?',
    duration: '8 min',
  },
  {
    dot: 'dotDim',
    text: 'Nutrition reminder: Protein-first lunch. Water before any other drink today.',
    duration: '\u2014',
  },
];

export default function DailyBriefing() {
  const { user, userPlan, fitnessProfile } = useAuth();
  const noMindGames = fitnessProfile?.mind_games?.includes('No mind games') ?? false;

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const todayName = DAY_NAMES[new Date().getDay()];
  const todayFullName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayMins = userPlan?.days?.[todayName] ?? null;
  const isTrainingDay = todayMins !== null;
  const hasPlan = user && !!userPlan?.days;

  const breakdown = isTrainingDay ? getTimeBreakdown(todayMins, noMindGames) : null;

  // Build plan items for logged-in user
  const livePlanItems = useMemo(() => {
    if (!hasPlan) return null;
    if (!isTrainingDay) return null;
    const items = [];
    items.push({
      dot: 'dot',
      text: `${todayFullName} workout — ${breakdown.workout} min session scaled to your intensity level.`,
      duration: `${breakdown.workout} min`,
    });
    if (breakdown.journal > 0) {
      items.push({
        dot: 'dotGold',
        text: "Journal prompt ready. A few minutes of reflection compounds over time.",
        duration: `${breakdown.journal} min`,
      });
    }
    if (breakdown.mindGame > 0) {
      items.push({
        dot: 'dotGold',
        text: "Mind game queued — a short cognitive challenge to sharpen your focus.",
        duration: `${breakdown.mindGame} min`,
      });
    }
    return items;
  }, [hasPlan, isTrainingDay, todayFullName, breakdown]);

  const footerMessage = hasPlan
    ? isTrainingDay
      ? 'Your plan is ready.'
      : 'Rest Day — Recovery is part of the plan.'
    : user
      ? 'Build your plan to get started.'
      : 'Your plan is ready.';

  const displayItems = (hasPlan && isTrainingDay && livePlanItems) || staticPlanItems;

  return (
    <section id="daily" className={styles.section}>
      <div className={styles.grid}>
        <div className={styles.left}>
          <div className={styles.tag}>Daily Briefing</div>
          <h2 className={styles.title}>
            Today's plan,
            <br />
            built around today.
          </h2>
          <p className={styles.body}>
            Every morning Vela delivers a clear, concise briefing. No decisions
            required — just direction. This is what leadership looks like.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              {hasPlan && isTrainingDay
                ? `${todayFullName} — ${todayMins} min`
                : hasPlan && !isTrainingDay
                  ? 'Rest Day'
                  : "Today's Plan"}
            </span>
            <span className={styles.date}>{todayStr}</span>
          </div>
          <div className={styles.cardBody}>
            {hasPlan && !isTrainingDay ? (
              <div className={styles.planLine}>
                <div className={styles.dotDim} />
                <div className={styles.planText}>
                  Recovery is part of the plan. Your body adapts and
                  rebuilds on rest days. Enjoy the stillness.
                </div>
                <div className={styles.planDuration}>—</div>
              </div>
            ) : (
              displayItems.map((item) => (
                <div className={styles.planLine} key={item.text}>
                  <div className={styles[item.dot]} />
                  <div className={styles.planText}>{item.text}</div>
                  <div className={styles.planDuration}>{item.duration}</div>
                </div>
              ))
            )}
          </div>
          <div className={styles.cardFooter}>
            <div className={styles.sig}>
              <div className={styles.sigDot}>🐸</div>
              <span>Vela &middot; {footerMessage}</span>
            </div>
            {user ? (
              <Link to="/dashboard" className={styles.beginBtn}>
                {hasPlan && isTrainingDay ? 'Start Session →' : 'Dashboard →'}
              </Link>
            ) : (
              <button className={styles.beginBtn}>Begin →</button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
