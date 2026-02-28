'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LandingPage() {
  const [name, setName] = useState('');
  const router = useRouter();

  const handleStart = () => {
    if (!name.trim()) return;
    localStorage.setItem('userName', name.trim());
    router.push('/new');
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>AI Interview Coach</h1>
      <p className={styles.subtitle}>Adaptive mock interviews powered by AI</p>
      <div className={styles.form}>
        <input
          className={styles.input}
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
        />
        <button className={styles.button} onClick={handleStart} disabled={!name.trim()}>
          Get Started
        </button>
      </div>
    </main>
  );
}
