import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import styles from './Research.module.css';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const ALL = 'All';

export default function Research() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(ALL);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('research_articles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error('research_articles load failed:', error);
    setArticles(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => {
    const set = new Set();
    for (const a of articles) {
      if (a.category) set.add(a.category);
    }
    return [ALL, ...Array.from(set).sort()];
  }, [articles]);

  const visible = useMemo(() => {
    if (activeCategory === ALL) return articles;
    return articles.filter((a) => a.category === activeCategory);
  }, [articles, activeCategory]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/dashboard" className={styles.backLink}>
          ← Back to dashboard
        </Link>
        <h1 className={styles.title}>Research</h1>
        <p className={styles.subtitle}>
          Curated reading on exercise, mind, nutrition, and longevity.
        </p>

        {!loading && articles.length > 0 && categories.length > 2 && (
          <div className={styles.filterRow}>
            {categories.map((cat) => (
              <button
                key={cat}
                className={
                  activeCategory === cat
                    ? styles.filterBtnActive
                    : styles.filterBtn
                }
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className={styles.empty}>Loading...</p>
        ) : !articles.length ? (
          <p className={styles.empty}>
            Research and resources coming soon. Check back regularly.
          </p>
        ) : !visible.length ? (
          <p className={styles.empty}>
            No articles tagged "{activeCategory}" yet.
          </p>
        ) : (
          <div className={styles.list}>
            {visible.map((a) => (
              <article key={a.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{a.title}</h2>
                  {a.category && (
                    <span className={styles.badge}>{a.category}</span>
                  )}
                </div>
                <div className={styles.cardMeta}>
                  {a.source && <span className={styles.source}>{a.source}</span>}
                  <span className={styles.date}>{formatDate(a.created_at)}</span>
                </div>
                <p className={styles.summary}>{a.summary}</p>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.readLink}
                >
                  Read Article →
                </a>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
