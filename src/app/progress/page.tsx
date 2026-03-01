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

const CATEGORY_LABELS: Record<string, string> = {
  arrays_strings: 'Arrays / Strings',
  hash_maps: 'Hash Maps',
  linked_lists: 'Linked Lists',
  stacks_queues: 'Stacks / Queues',
  trees: 'Trees',
  graphs: 'Graphs',
  dynamic_programming: 'Dynamic Programming',
  recursion_backtracking: 'Recursion / Backtracking',
  heaps_priority_queues: 'Heaps / Priority Queues',
  revenue_problems: 'Revenue Problems',
  cost_problems: 'Cost Problems',
  strategic_decisions: 'Strategic Decisions',
  investment_decisions: 'Investment Decisions',
  operational_bottlenecks: 'Operational Bottlenecks',
  technical_proficiency: 'Technical Proficiency (GAAP/IFRS)',
  behavioral_star: 'Behavioral (STAR-based)',
  software_process: 'Software / Process (Excel, ERP)',
  industry_specific: 'Industry-Specific (AP/AR)',
  product_sense: 'Product Sense',
  metrics: 'Metrics',
  tradeoffs: 'Tradeoffs',
  prioritization: 'Prioritization',
  leadership: 'Leadership',
  conflict: 'Conflict',
  failure: 'Failure',
  teamwork: 'Teamwork',
  growth: 'Growth',
  communication: 'Communication',
  scenario: 'Scenario',
  depth: 'Depth',
};

interface CategoryRecord {
  category: string;
  score: number;
  completed: boolean;
  interviewNumber: number;
  mistakes?: string[];
  strengths?: string[];
  weaknesses?: string[];
  timestamp: number;
  improvementDelta?: number;
}

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
  categoryHistory: CategoryRecord[];
  categoryStats: Record<string, { scores: number[]; completed: boolean; latestScore: number; mistakes: string[]; strengths: string[]; weaknesses: string[] }>;
  overallAvg: number;
  mostImproved: string | null;
  mostImprovedDelta: number | null;
  repeatedMistakes: { mistake: string; count: number }[];
  totalInterviews: number;
  completedCategories: string[];
  inProgressCategories: string[];
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

function catLabel(cat: string): string {
  return CATEGORY_LABELS[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
      avg: Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10,
    }))
    .sort((a, b) => a.avg - b.avg);

  // Determine next interview category info
  const lastRecord = data.categoryHistory.length > 0 ? data.categoryHistory[data.categoryHistory.length - 1] : null;
  let nextCategoryInfo = 'Random category (first interview)';
  if (lastRecord) {
    if (lastRecord.score < 7.5) {
      nextCategoryInfo = `Retry: ${catLabel(lastRecord.category)} (last score: ${lastRecord.score}/10 — below 7.5 threshold)`;
    } else {
      nextCategoryInfo = `New category (${catLabel(lastRecord.category)} completed with ${lastRecord.score}/10)`;
    }
  }

  // Category averages for stats
  const categoryAverages = Object.entries(data.categoryStats)
    .map(([cat, stats]) => ({
      category: cat,
      avg: Math.round((stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) * 10) / 10,
      attempts: stats.scores.length,
      completed: stats.completed,
      latestScore: stats.latestScore,
    }))
    .sort((a, b) => a.avg - b.avg);

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Your Progress</h1>
      <p className={styles.subtitle}>{data.sessions.length} session{data.sessions.length !== 1 ? 's' : ''} completed</p>

      {/* Next Interview Section — info only, no button here */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Next Interview</h2>
        <div className={styles.nextInterviewCard}>
          <p>{nextCategoryInfo}</p>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Statistics</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{data.overallAvg || '\u2014'}</div>
            <div className={styles.statLabel}>Overall Avg Score</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{data.totalInterviews}</div>
            <div className={styles.statLabel}>Total Interviews</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{data.completedCategories.length}</div>
            <div className={styles.statLabel}>Categories Completed</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{data.inProgressCategories.length}</div>
            <div className={styles.statLabel}>Categories In Progress</div>
          </div>
        </div>

        {data.mostImproved && (
          <div className={styles.highlightCard}>
            Most Improved: <strong>{catLabel(data.mostImproved)}</strong>
            {data.mostImprovedDelta !== null && ` (+${data.mostImprovedDelta.toFixed(1)} points)`}
          </div>
        )}
      </div>

      {/* Latest Category Status */}
      {lastRecord && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Latest Category Status</h2>
          <div className={styles.nextInterviewCard}>
            <p style={{ fontWeight: 600 }}>
              {catLabel(lastRecord.category)} — {lastRecord.score >= 7.5 ? 'Completed' : 'In Progress'}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Score: {lastRecord.score}/10
            </p>
          </div>
        </div>
      )}

      {/* Completed Categories */}
      {data.completedCategories.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Completed Categories</h2>
          <ul className={styles.list}>
            {data.completedCategories.map((cat) => (
              <li key={cat}>{catLabel(cat)} \u2713</li>
            ))}
          </ul>
        </div>
      )}

      {/* In Progress Categories */}
      {data.inProgressCategories.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>In Progress Categories</h2>
          <ul className={styles.list}>
            {data.inProgressCategories.map((cat) => (
              <li key={cat}>{catLabel(cat)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Scores Per Category */}
      {categoryAverages.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Scores by Category</h2>
          <div className={styles.skillGrid}>
            {categoryAverages.map((c) => (
              <div key={c.category} className={styles.skillRow}>
                <span className={styles.skillName}>
                  {catLabel(c.category)}
                  {c.completed && ' \u2713'}
                </span>
                <div className={styles.skillBarBg}>
                  <div
                    className={styles.skillBarFill}
                    style={{ width: `${c.avg * 10}%`, background: barColor(c.avg) }}
                  />
                </div>
                <span className={styles.skillScore}>{c.avg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repeated Mistakes */}
      {data.repeatedMistakes.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Repeated Mistakes</h2>
          <ul className={styles.list}>
            {data.repeatedMistakes.slice(0, 5).map((m, i) => (
              <li key={i}>{m.mistake} <span style={{ color: 'var(--text-secondary)' }}>({m.count}x)</span></li>
            ))}
          </ul>
        </div>
      )}

      {/* Session History */}
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

      {/* Skill Averages */}
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
        <a href="/new" className={styles.actionButton}>Next Interview</a>
        <a href="/new?reset=1" className={styles.actionButton} style={{ background: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)', marginLeft: '0.75rem' }}>New Session</a>
      </div>
    </main>
  );
}
