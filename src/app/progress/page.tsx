'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const SKILL_LABELS: Record<string, string> = {
  problem_solving: 'Problem Solving',
  tradeoff_reasoning: 'Tradeoff Reasoning',
  system_design: 'System Design',
  edge_case_handling: 'Edge Case Handling',
  time_complexity: 'Time Complexity',
  communication_clarity: 'Communication',
  star_structure: 'STAR Structure',
  specificity: 'Specificity',
  ownership: 'Ownership',
  reflection: 'Reflection',
  quantification: 'Quantification',
};

interface ProgressData {
  userName: string;
  sessions: {
    sessionId: string;
    role: string;
    interviewType: string;
    overallScore: number;
    date: number;
  }[];
  skillTrends: Record<string, number[]>;
}

function scoreColor(score: number): string {
  if (score >= 7) return styles.scoreGreen;
  if (score >= 5) return styles.scoreYellow;
  return styles.scoreRed;
}

function barColor(score: number): string {
  if (score >= 7) return 'var(--success)';
  if (score >= 5) return 'var(--warning)';
  return 'var(--danger)';
}

export default function ProgressPage() {
  const router = useRouter();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userName = localStorage.getItem('userName');
    if (!userName) {
      router.push('/');
      return;
    }

    fetch(`/api/progress?user=${encodeURIComponent(userName)}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className={styles.loading}>Loading progress...</div>;

  if (!data || data.sessions.length === 0) {
    return (
      <main className={styles.container}>
        <h1 className={styles.title}>Your Progress</h1>
        <div className={styles.empty}>
          <p>No sessions yet. Complete an interview to see your progress.</p>
          <a href="/new" className={styles.actionButton} style={{ marginTop: '1rem', display: 'inline-block' }}>
            Start Interview
          </a>
        </div>
      </main>
    );
  }

  // Calculate average per skill from trends
  const skillAverages: { skill: string; avg: number }[] = Object.entries(data.skillTrends)
    .filter(([, scores]) => scores && scores.length > 0)
    .map(([skill, scores]) => ({
      skill,
      avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    }))
    .sort((a, b) => a.avg - b.avg);

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Your Progress</h1>
      <p className={styles.subtitle}>{data.sessions.length} session{data.sessions.length !== 1 ? 's' : ''} completed</p>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Session History</h2>
        <div className={styles.sessionList}>
          {data.sessions.map((s) => (
            <a key={s.sessionId} href={`/report/${s.sessionId}`} className={styles.sessionRow}>
              <div className={styles.sessionInfo}>
                <span className={styles.tag}>{s.interviewType.toUpperCase()}</span>
                <span>{s.role}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {new Date(s.date).toLocaleDateString()}
                </span>
              </div>
              <span className={`${styles.sessionScore} ${scoreColor(s.overallScore)}`}>
                {s.overallScore}/10
              </span>
            </a>
          ))}
        </div>
      </div>

      {skillAverages.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Skill Averages</h2>
          <div className={styles.skillGrid}>
            {skillAverages.map((s) => (
              <div key={s.skill} className={styles.skillRow}>
                <span className={styles.skillName}>{SKILL_LABELS[s.skill] || s.skill}</span>
                <div className={styles.skillBarBg}>
                  <div
                    className={styles.skillBarFill}
                    style={{ width: `${s.avg * 10}%`, background: barColor(s.avg) }}
                  />
                </div>
                <span className={styles.skillScore}>{s.avg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <a href="/new" className={styles.actionButton}>Start New Session</a>
      </div>
    </main>
  );
}
