'use client';
import { useState, useEffect, Suspense } from 'react';
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

    // If reset, clear stored job context
    if (isReset) {
      localStorage.removeItem('jobRole');
      localStorage.removeItem('jobCompany');
      localStorage.removeItem('jobDescription');
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

  const handleSubmit = async () => {
    if (!role.trim() || !jobDescription.trim()) return;
    setLoading(true);
    setError('');

    // Lock job context in localStorage for future interviews
    localStorage.setItem('jobRole', role.trim());
    localStorage.setItem('jobCompany', company.trim());
    localStorage.setItem('jobDescription', jobDescription.trim());

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName,
          role: role.trim(),
          company: company.trim() || undefined,
          jobDescription: jobDescription.trim(),
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

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>{locked ? 'Next Interview' : 'New Interview Session'}</h1>
      <p className={styles.subtitle}>Welcome, {userName}. {locked ? 'Your job context is locked from before.' : 'Fill in the details below.'}</p>

      <div className={styles.form}>
        <div className={styles.field}>
          <label>Role Title</label>
          <input
            type="text"
            placeholder="e.g., Software Engineer"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={locked}
          />
        </div>

        <div className={styles.field}>
          <label>Company <span className={styles.optional}>(optional)</span></label>
          <input
            type="text"
            placeholder="e.g., Google"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            disabled={locked}
          />
        </div>

        <div className={styles.field}>
          <label>Job Description</label>
          <textarea
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            disabled={locked}
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
