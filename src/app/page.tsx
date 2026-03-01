'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import ShaderBackground from '@/components/ui/shader-background';

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

const STATS = [
  { num: '4+', label: 'Interview Domains' },
  { num: 'AI', label: 'Adaptive Scoring' },
  { num: '3', label: 'World-class APIs' },
  { num: '∞', label: 'Practice Sessions' },
];

export default function LandingPage() {
  const [name, setName] = useState('');
  const router = useRouter();

  // Intersection Observer — drives [data-reveal] scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -24px 0px' }
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleStart = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const prevName = localStorage.getItem('userName');
    if (prevName !== trimmedName) {
      localStorage.removeItem('jobRole');
      localStorage.removeItem('jobCompany');
      localStorage.removeItem('jobDescription');
    }
    localStorage.setItem('userName', trimmedName);
    router.push('/new');
  };

  return (
    <div className={styles.page}>

      {/* ══════════════════════════════════════
          HERO — floating logo, full viewport
          ══════════════════════════════════════ */}
      <section className={styles.hero}>
        {/* Background layers — bottom to top */}
        <ShaderBackground className={styles.shaderCanvas} />
        <div className={styles.shaderOverlay} aria-hidden="true" />
        <div className={styles.heroBg}         aria-hidden="true" />
        <div className={styles.orb1}           aria-hidden="true" />
        <div className={styles.orb2}           aria-hidden="true" />
        <div className={styles.orb3}           aria-hidden="true" />

        <div className={styles.heroContent}>
          {/* Eyebrow badge */}
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            AI Mock Interview Platform
          </div>

          {/* Floating logo */}
          <div className={styles.floatingLogoWrap}>
            <h1 className={styles.heroTitle}>
              Interview<span className={styles.accent}>IQ</span>
            </h1>
            <div className={styles.logoGlow} aria-hidden="true" />
          </div>

          <p className={styles.heroSubtitle}>
            Adaptive mock interviews powered by AI. Practice smarter,
            track your progress, and arrive at every interview prepared.
          </p>

          <div className={styles.heroForm}>
            <input
              className={styles.input}
              type="text"
              placeholder="Enter your name to begin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              autoFocus
            />
            <button className={styles.ctaButton} onClick={handleStart} disabled={!name.trim()}>
              Get Started →
            </button>
          </div>

          <p className={styles.heroHint}>No account required · Progress saved per name</p>
        </div>

        {/* Scroll indicator */}
        <div className={styles.scrollIndicator} aria-hidden="true">
          <span className={styles.scrollLabel}>Scroll</span>
          <div className={styles.scrollLine} />
        </div>
      </section>

      {/* ══════════════════════════════════════
          STATS STRIP
          ══════════════════════════════════════ */}
      <div className={styles.statsStrip}>
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className={styles.stat}
            data-reveal=""
            style={{ transitionDelay: `${i * 0.08}s` }}
          >
            <span className={styles.statNum}>{s.num}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════
          HOW IT WORKS
          ══════════════════════════════════════ */}
      <section className={styles.section}>
        <div className={styles.sectionWrap}>
          <div className={styles.sectionHeader} data-reveal="">
            <div className={styles.sectionLabel}>How it works</div>
            <h2 className={styles.sectionTitle}>Built to make you better</h2>
            <p className={styles.sectionDesc}>
              A structured, intelligent interview system that adapts to your performance over time.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {FEATURES.map((f, i) => (
              <div
                key={f.num}
                className={styles.featureCard}
                data-reveal=""
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className={styles.featureNum}>{f.num}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          POWERED BY
          ══════════════════════════════════════ */}
      <section className={styles.poweredBy}>
        <div className={styles.sectionWrap}>
          <div className={styles.sectionHeader} data-reveal="">
            <div className={styles.sectionLabel}>Powered by</div>
            <h2 className={styles.sectionTitle}>World-class APIs, transparent stack</h2>
            <p className={styles.sectionDesc}>
              We believe in transparency about the technology driving your preparation.
            </p>
          </div>

          <div className={styles.apiGrid}>
            {APIS.map((a, i) => (
              <div
                key={a.name}
                className={styles.apiCard}
                data-reveal=""
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
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

      {/* ══════════════════════════════════════
          FOOTER
          ══════════════════════════════════════ */}
      <footer className={styles.footer}>
        <p>InterviewIQ &mdash; Built for serious preparation.</p>
      </footer>

    </div>
  );
}
