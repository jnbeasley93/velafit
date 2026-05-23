import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import styles from './Nutrition.module.css';

const TABS = [
  { key: 'grocery', label: 'Grocery List' },
  { key: 'protein', label: 'Protein Guide' },
  { key: 'avoid', label: 'Foods to Avoid' },
  { key: 'habits', label: 'Habits' },
  { key: 'updates', label: 'Updates' },
];

const GROCERY_CATEGORIES = [
  {
    title: 'Proteins',
    accent: 'green',
    items: [
      'Chicken breast',
      'Turkey',
      'Salmon',
      'Tuna',
      'Eggs',
      'Greek yogurt',
      'Cottage cheese',
      'Lean ground beef',
      'Shrimp',
      'Edamame',
    ],
  },
  {
    title: 'Complex Carbs',
    accent: 'gold',
    items: [
      'Brown rice',
      'Sweet potatoes',
      'Oats',
      'Quinoa',
      'Whole grain bread',
      'Black beans',
      'Lentils',
      'Chickpeas',
    ],
  },
  {
    title: 'Vegetables',
    accent: 'greenAccent',
    items: [
      'Spinach',
      'Broccoli',
      'Kale',
      'Brussels sprouts',
      'Bell peppers',
      'Asparagus',
      'Zucchini',
      'Cucumber',
      'Carrots',
      'Celery',
    ],
  },
  {
    title: 'Fruits',
    accent: 'rust',
    items: [
      'Blueberries',
      'Strawberries',
      'Bananas',
      'Apples',
      'Oranges',
      'Avocado',
      'Mango',
    ],
  },
  {
    title: 'Healthy Fats',
    accent: 'stone',
    items: [
      'Almonds',
      'Walnuts',
      'Olive oil',
      'Peanut butter',
      'Chia seeds',
      'Flaxseeds',
      'Coconut oil',
    ],
  },
];

const PROTEIN_TABLE = [
  { weight: '120 lbs', target: '84 – 120 g' },
  { weight: '150 lbs', target: '105 – 150 g' },
  { weight: '175 lbs', target: '122 – 175 g' },
  { weight: '200 lbs', target: '140 – 200 g' },
];

const PROTEIN_SOURCES = [
  { source: 'Chicken breast', serving: '4 oz', grams: '35 g' },
  { source: 'Lean ground beef', serving: '4 oz', grams: '28 g' },
  { source: 'Salmon', serving: '4 oz', grams: '25 g' },
  { source: 'Greek yogurt', serving: '1 cup', grams: '17 g' },
  { source: 'Cottage cheese', serving: '1 cup', grams: '24 g' },
  { source: 'Eggs', serving: '2 large', grams: '12 g' },
  { source: 'Tuna (canned)', serving: '1 can', grams: '22 g' },
  { source: 'Black beans', serving: '1 cup', grams: '15 g' },
  { source: 'Lentils', serving: '1 cup', grams: '18 g' },
  { source: 'Almonds', serving: '1 oz', grams: '6 g' },
];

const AVOID_CATEGORIES = [
  {
    title: 'Ultra-processed foods',
    examples: 'Frozen meals, fast food, packaged snacks',
    why: 'Engineered to be hyper-palatable, calorie-dense, and easy to overeat. Often stripped of fiber and nutrients.',
  },
  {
    title: 'Liquid calories',
    examples: 'Soda, energy drinks, flavored coffees, alcohol',
    why: "Calories you don't feel. They don't trigger fullness signals, so they add to your daily intake without satisfying hunger.",
  },
  {
    title: 'Refined carbs',
    examples: 'White bread, pastries, sugary cereals',
    why: 'Spike blood sugar fast and crash it just as quickly — leaving you hungry, tired, and reaching for more.',
  },
  {
    title: 'Hidden sugar foods',
    examples: 'Flavored yogurts, granola bars, "low fat" products',
    why: 'Marketed as healthy but often contain as much added sugar as candy. Read labels — sugar hides under dozens of names.',
  },
  {
    title: 'Trans fats',
    examples: 'Margarine, fried foods, partially hydrogenated oils',
    why: 'The one fat with no safe amount. Strongly linked to heart disease and inflammation. Avoid them entirely when possible.',
  },
];

const HABITS = [
  'Eat protein at every meal',
  'Drink water before every meal (helps portion control)',
  'Prep meals on Sunday for the week',
  'Never shop hungry',
  "Read ingredient labels — if you can't pronounce it, think twice",
  'Eat vegetables first at every meal',
  "Don't drink your calories",
  'Aim for 80/20 — 80% whole foods, 20% flexibility',
  'Eat slowly and without screens',
  'Sleep 7 – 9 hours — poor sleep increases hunger hormones',
];

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function GroceryTab() {
  return (
    <div className={styles.tabBody}>
      <p className={styles.tabIntro}>
        A starter list of whole foods to build meals around. Pick what you'll
        actually eat — the goal is consistency, not perfection.
      </p>
      <div className={styles.groceryGrid}>
        {GROCERY_CATEGORIES.map((cat) => (
          <div
            key={cat.title}
            className={`${styles.groceryCard} ${styles[`accent_${cat.accent}`]}`}
          >
            <h3 className={styles.groceryTitle}>{cat.title}</h3>
            <ul className={styles.groceryList}>
              {cat.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProteinTab() {
  return (
    <div className={styles.tabBody}>
      <h2 className={styles.h2}>How much protein do you need?</h2>
      <p className={styles.tabIntro}>
        <strong>General rule:</strong> 0.7 – 1 g of protein per pound of
        bodyweight for active individuals.
      </p>

      <h3 className={styles.h3}>Daily target by body weight</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Body weight</th>
            <th>Daily protein target</th>
          </tr>
        </thead>
        <tbody>
          {PROTEIN_TABLE.map((row) => (
            <tr key={row.weight}>
              <td>{row.weight}</td>
              <td>{row.target}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className={styles.h3}>Top protein sources</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Food</th>
            <th>Serving</th>
            <th>Protein</th>
          </tr>
        </thead>
        <tbody>
          {PROTEIN_SOURCES.map((row) => (
            <tr key={row.source}>
              <td>{row.source}</td>
              <td>{row.serving}</td>
              <td>{row.grams}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.tipBox}>
        <strong>Timing tip:</strong> aim for 20 – 40 g of protein within 2 hours
        of training to support recovery.
      </div>
    </div>
  );
}

function AvoidTab() {
  return (
    <div className={styles.tabBody}>
      <p className={styles.tabIntro}>
        Not banned — but worth being honest about. These foods work against
        the goals most people are training for.
      </p>
      <div className={styles.avoidList}>
        {AVOID_CATEGORIES.map((cat) => (
          <div key={cat.title} className={styles.avoidCard}>
            <h3 className={styles.avoidTitle}>{cat.title}</h3>
            <p className={styles.avoidExamples}>{cat.examples}</p>
            <p className={styles.avoidWhy}>{cat.why}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HabitsTab() {
  return (
    <div className={styles.tabBody}>
      <h2 className={styles.h2}>Nutrition habits worth building</h2>
      <p className={styles.tabIntro}>
        Stack a few of these and the rest mostly takes care of itself.
      </p>
      <ol className={styles.habitsList}>
        {HABITS.map((habit, i) => (
          <li key={habit} className={styles.habitItem}>
            <span className={styles.habitNum}>{i + 1}</span>
            <span className={styles.habitText}>{habit}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function UpdatesTab() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('nutrition_updates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error('nutrition_updates load failed:', error);
    setUpdates(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className={styles.tabBody}>
        <p className={styles.empty}>Loading...</p>
      </div>
    );
  }

  if (!updates.length) {
    return (
      <div className={styles.tabBody}>
        <p className={styles.empty}>
          Check back soon — nutrition tips and updates coming regularly.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.tabBody}>
      <div className={styles.updatesList}>
        {updates.map((u) => (
          <article key={u.id} className={styles.updateCard}>
            <div className={styles.updateHeader}>
              <h3 className={styles.updateTitle}>{u.title}</h3>
              {u.category && (
                <span className={styles.badge}>{u.category}</span>
              )}
            </div>
            <p className={styles.updateDate}>{formatDate(u.created_at)}</p>
            <p className={styles.updateBody}>{u.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function Nutrition({ embedded = false }) {
  const [activeTab, setActiveTab] = useState('grocery');

  const body = (
    <>
      {!embedded && (
        <>
          <Link to="/dashboard" className={styles.backLink}>
            ← Back to dashboard
          </Link>
          <h1 className={styles.title}>Nutrition</h1>
          <p className={styles.subtitle}>
            Simple principles. Real food. Built around how you actually eat.
          </p>
        </>
      )}

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={activeTab === t.key}
            className={
              activeTab === t.key ? styles.tabBtnActive : styles.tabBtn
            }
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'grocery' && <GroceryTab />}
      {activeTab === 'protein' && <ProteinTab />}
      {activeTab === 'avoid' && <AvoidTab />}
      {activeTab === 'habits' && <HabitsTab />}
      {activeTab === 'updates' && <UpdatesTab />}
    </>
  );

  if (embedded) return body;

  return (
    <div className={styles.page}>
      <div className={styles.container}>{body}</div>
    </div>
  );
}
