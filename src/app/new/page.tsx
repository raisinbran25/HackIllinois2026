'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';

function NewSessionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReset = searchParams.get('reset') === '1';
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('userName');
    if (!stored) {
      router.push('/');
      return;
    }
    setUserName(stored);

    // If reset, clear stored job context and all server-side data
    if (isReset) {
      localStorage.removeItem('jobRole');
      localStorage.removeItem('jobCompany');
      localStorage.removeItem('jobDescription');
      // Clear Supermemory + in-memory store on the server
      fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: stored }),
      }).catch(() => {});
      return;
    }

    // Load locked job context if it exists
    const savedRole = localStorage.getItem('jobRole');
    const savedCompany = localStorage.getItem('jobCompany');
    const savedJD = localStorage.getItem('jobDescription');
    if (savedRole && savedJD) {
      setRole(savedRole);
      setCompany(savedCompany || '');
      setJobDescription(savedJD);
      setLocked(true);
    }
  }, [router, isReset]);

  const createSession = async (r: string, c: string, jd: string, user: string) => {
    setLoading(true);
    setError('');

    // Lock job context in localStorage for future interviews
    localStorage.setItem('jobRole', r);
    localStorage.setItem('jobCompany', c);
    localStorage.setItem('jobDescription', jd);

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: user,
          role: r,
          company: c || undefined,
          jobDescription: jd,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create session');
      }

      const data = await res.json();
      router.push(`/session/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  // Auto-submit when job context is locked (Next Interview flow)
  // Skip the form entirely — go straight to interview
  const autoSubmitDone = useRef(false);
  useEffect(() => {
    if (locked && userName && role && jobDescription && !autoSubmitDone.current) {
      autoSubmitDone.current = true;
      createSession(role.trim(), company.trim(), jobDescription.trim(), userName);
    }
  }, [locked, userName, role, jobDescription]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!role.trim() || !jobDescription.trim()) return;
    await createSession(role.trim(), company.trim(), jobDescription.trim(), userName);
  };

  // If locked, show a loading/error state (auto-submit is in progress)
  if (locked) {
    return (
      <main className={styles.container}>
        <h1 className={styles.title}>Starting Next Interview...</h1>
        <p className={styles.subtitle}>Using your existing job context. Preparing questions...</p>
        {error && (
          <div style={{ marginTop: '1rem' }}>
            <p className={styles.error}>{error}</p>
            <button className={styles.button} onClick={() => createSession(role.trim(), company.trim(), jobDescription.trim(), userName)} disabled={loading}>
              {loading ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>New Interview Session</h1>
      <p className={styles.subtitle}>Welcome, {userName}. Fill in the details below.</p>

      <div className={styles.form}>
        <div className={styles.field}>
          <label>Role Title</label>
          <input
            type="text"
            placeholder="e.g., Software Engineer"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label>Company <span className={styles.optional}>(optional)</span></label>
          <input
            type="text"
            placeholder="e.g., Google"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label>Job Description</label>
          <textarea
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.button}
          onClick={handleSubmit}
          disabled={loading || !role.trim() || !jobDescription.trim()}
        >
          {loading ? 'Starting Interview...' : 'Start Interview'}
        </button>
      </div>
    </main>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>}>
      <NewSessionForm />
    </Suspense>
  );
}
