'use client';
import { useState, useEffect, use } from 'react';
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

interface Drill {
  title: string;
  problemStatement: string;
  functionSignature?: string;
  exampleInput?: string;
  exampleOutput?: string;
  starterCode?: string;
  hints?: string[];
  targetSkill?: string;
}

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
};

interface Report {
  sessionId: string;
  userName: string;
  role: string;
  interviewType: string;
  questionCategory?: string;
  overallScore: number;
  skillScores: { skill: string; score: number; evidence: string }[];
  strengths: string[];
  weaknesses: string[];
  drills: (string | Drill)[];
  summary: string;
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

function isDrill(d: string | Drill): d is Drill {
  return typeof d === 'object' && d !== null && 'title' in d;
}

function DrillCard({ drill }: { drill: Drill }) {
  return (
    <div className={styles.drillCard}>
      <h3 className={styles.drillTitle}>{drill.title}</h3>
      {drill.targetSkill && (
        <span className={styles.drillSkillTag}>
          {SKILL_LABELS[drill.targetSkill] || drill.targetSkill}
        </span>
      )}
      <p className={styles.drillProblem}>{drill.problemStatement}</p>

      {drill.functionSignature && (
        <div className={styles.drillSection}>
          <span className={styles.drillLabel}>Signature</span>
          <pre className={styles.codeBlock}><code>{drill.functionSignature}</code></pre>
        </div>
      )}

      {(drill.exampleInput || drill.exampleOutput) && (
        <div className={styles.drillSection}>
          <span className={styles.drillLabel}>Example</span>
          <pre className={styles.codeBlock}>
            <code>{drill.exampleInput && `Input:  ${drill.exampleInput}`}{drill.exampleInput && drill.exampleOutput && '\n'}{drill.exampleOutput && `Output: ${drill.exampleOutput}`}</code>
          </pre>
        </div>
      )}

      {drill.starterCode && (
        <div className={styles.drillSection}>
          <span className={styles.drillLabel}>Starter Code</span>
          <pre className={styles.codeBlock}><code>{drill.starterCode}</code></pre>
        </div>
      )}

      {drill.hints && drill.hints.length > 0 && (
        <div className={styles.drillSection}>
          <span className={styles.drillLabel}>Hints</span>
          <ul className={styles.hintList}>
            {drill.hints.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/sessions/${id}/report`);
        if (!res.ok) throw new Error('Report not found');
        const data = await res.json();
        setReport(data);
      } catch {
        setError('Report not found. The session may still be in progress.');
      }
    }
    fetchReport();
  }, [id]);

  if (error) {
    return (
      <div className={styles.loading}>
        <div style={{ textAlign: 'center' }}>
          <p>{error}</p>
          <a href="/new" className={`${styles.actionButton} ${styles.primaryAction}`} style={{ marginTop: '1rem', display: 'inline-block' }}>
            Start New Session
          </a>
        </div>
      </div>
    );
  }

  if (!report) {
    return <div className={styles.loading}>Loading report...</div>;
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Interview Report</h1>
      <div className={styles.meta}>
        <span className={styles.tag}>{report.interviewType.toUpperCase()}</span>
        <span className={styles.tag}>{report.role}</span>
        {report.questionCategory && (
          <span className={styles.tag}>
            {CATEGORY_LABELS[report.questionCategory] || report.questionCategory.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        )}
      </div>

      <div className={styles.overallScore}>
        <div className={`${styles.scoreNumber} ${scoreColor(report.overallScore)}`}>
          {report.overallScore}/10
        </div>
        <div className={styles.scoreLabel}>Overall Score</div>
      </div>

      {report.skillScores.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Skill Breakdown</h2>
          <div className={styles.skillGrid}>
            {report.skillScores.map((s) => (
              <div key={s.skill} className={styles.skillRow}>
                <span className={styles.skillName}>{SKILL_LABELS[s.skill] || s.skill}</span>
                <div className={styles.skillBarBg}>
                  <div
                    className={styles.skillBarFill}
                    style={{ width: `${s.score * 10}%`, background: barColor(s.score) }}
                  />
                </div>
                <span className={styles.skillScore}>{s.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.strengths.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Strengths</h2>
          <ul className={styles.list}>
            {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {report.weaknesses.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Areas for Improvement</h2>
          <ul className={styles.list}>
            {report.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {report.drills.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Practice Drills</h2>
          <div className={styles.drillsGrid}>
            {report.drills.map((d, i) =>
              isDrill(d) ? (
                <DrillCard key={i} drill={d} />
              ) : (
                <div key={i} className={styles.drillCard}>
                  <p className={styles.drillProblem}>{d}</p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Summary</h2>
        <div className={styles.summary}>{report.summary}</div>
      </div>

      <div className={styles.actions}>
        <a href="/progress" className={`${styles.actionButton} ${styles.primaryAction}`}>
          View Progress
        </a>
        <a href="/new?reset=1" className={`${styles.actionButton} ${styles.secondaryAction}`}>
          New Session
        </a>
      </div>
    </main>
  );
}
