import styles from './Nav.module.css';

export default function Nav() {
  return (
    <nav className={styles.nav}>
      <a href="/" className={styles.logo}>AI Interview Coach</a>
      <div className={styles.links}>
        <a href="/new">New Session</a>
        <a href="/progress">Progress</a>
      </div>
    </nav>
  );
}
