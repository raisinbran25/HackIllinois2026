'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const FEATURES = [
  {
    num: '01',
    title: 'AI-Powered Questions',
    description:
      'Role-specific interview questions are generated and evaluated in real time, tailored to your target position and job description.',
  },
  {
    num: '02',
    title: 'Adaptive Difficulty',
    description:
      'The system tracks your performance per category and retests areas you struggle with until you reach a consistent passing threshold.',
  },
  {
    num: '03',
    title: 'Detailed Reports',
    description:
      'Each session produces a full performance report: skill breakdowns, strengths, weaknesses, and targeted practice drills.',
  },
  {
    num: '04',
    title: 'Voice Interviewer',
    description:
      'Enable optional AI voice synthesis for a more realistic, immersive interview experience with natural-sounding speech.',
  },
];

const APIS = [
  {
    name: 'OpenAI',
    role: 'Question Generation & Evaluation',
    description:
      'Generates role-specific interview questions from your job description and evaluates responses with nuanced, skill-level scoring.',
  },
  {
    name: 'Supermemory',
    role: 'Memory & Context Enhancement',
    description:
      'References your past interview sessions to improve adaptive scoring accuracy and generate more insightful, personalized reports.',
  },
  {
    name: 'ElevenLabs',
    role: 'Voice Synthesis (Optional)',
    description:
      'Powers the optional AI voice interviewer with high-quality, natural-sounding text-to-speech when voice mode is enabled.',
  },
];

export default function LandingPage() {
  const [name, setName] = useState('');
  const router = useRouter();

  const handleStart = () => {
    if (!name.trim()) return;
    localStorage.setItem('userName', name.trim());
    router.push('/new');
  };

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>AI Mock Interview Platform</div>
          <h1 className={styles.heroTitle}>InterviewIQ</h1>
          <p className={styles.heroSubtitle}>
            Adaptive mock interviews powered by AI. Practice smarter, track your progress, and
            arrive at every interview prepared.
          </p>
          <div className={styles.heroForm}>
            <input
              className={styles.input}
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              autoFocus
            />
            <button className={styles.ctaButton} onClick={handleStart} disabled={!name.trim()}>
              Get Started
            </button>
          </div>
          <p className={styles.heroHint}>No account required. Progress is saved per name.</p>
        </div>
      </section>

      {/* How it Works */}
      <section className={styles.section}>
        <div className={styles.sectionWrap}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>How it works</h2>
            <p className={styles.sectionDesc}>
              A structured, intelligent interview system that adapts to your performance over time.
            </p>
          </div>
          <div className={styles.featureGrid}>
            {FEATURES.map((f) => (
              <div key={f.num} className={styles.featureCard}>
                <div className={styles.featureNum}>{f.num}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Powered By */}
      <section className={styles.poweredBy}>
        <div className={styles.sectionWrap}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Powered by</h2>
            <p className={styles.sectionDesc}>
              InterviewIQ integrates industry-leading APIs. We believe in transparency about the
              technology driving your preparation.
            </p>
          </div>
          <div className={styles.apiGrid}>
            {APIS.map((a) => (
              <div key={a.name} className={styles.apiCard}>
                <div className={styles.apiHeader}>
                  <span className={styles.apiName}>{a.name}</span>
                  <span className={styles.apiRole}>{a.role}</span>
                </div>
                <p className={styles.apiDesc}>{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>InterviewIQ &mdash; Built for serious preparation.</p>
      </footer>
    </div>
  );
}
