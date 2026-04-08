import { useAuth } from '../contexts/AuthContext';

const badgeStyle = {
  display: 'inline-block',
  background: 'var(--gold)',
  color: 'var(--green-deep)',
  fontSize: '0.58rem',
  fontWeight: 700,
  padding: '0.15rem 0.45rem',
  borderRadius: '2px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginLeft: '0.5rem',
  verticalAlign: 'middle',
};

const lockStyle = {
  ...badgeStyle,
  background: 'rgba(74, 140, 92, 0.15)',
  color: 'var(--stone)',
};

export default function ProBadge({ locked }) {
  const { isPro } = useAuth();

  if (isPro && !locked) return null;

  return (
    <span style={locked && !isPro ? lockStyle : badgeStyle}>PRO</span>
  );
}
