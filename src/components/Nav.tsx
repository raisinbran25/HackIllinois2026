'use client';
import { usePathname } from 'next/navigation';
import styles from './Nav.module.css';

export default function Nav() {
  const pathname = usePathname();

  // During interview — only "New Session" (resets everything)
  const isInSession = pathname.startsWith('/session/');

  // After interview (report page) — Progress + New Session
  const isReportPage = pathname.startsWith('/report/');

  return (
    <nav className={styles.nav}>
      <a href="/" className={styles.logo}>
        <span className={styles.logoMark} aria-hidden="true">◆</span>
        InterviewIQ
      </a>
      <div className={styles.links}>
        {isInSession ? (
          // During interview: only New Session
          <a href="/new?reset=1">New Session</a>
        ) : isReportPage ? (
          // After interview: Progress + New Session
          <>
            <a href="/progress">Progress</a>
            <a href="/new?reset=1">New Session</a>
          </>
        ) : (
          // Default navigation (home, new, progress pages)
          <>
            <a href="/new">Next Interview</a>
            <a href="/progress">Progress</a>
            <a href="/new?reset=1">New Session</a>
          </>
        )}
      </div>
    </nav>
  );
}
