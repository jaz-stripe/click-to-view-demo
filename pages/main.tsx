import { useRouter } from 'next/router';
import styles from '../styles/Main.module.css';

export default function Main() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>TVNZ</h1>
        <nav className={styles.nav}>
          <button onClick={() => router.push('/')} className={styles.navButton}>Logout</button>
        </nav>
      </header>
      <main className={styles.main}>
        <h2 className={styles.title}>Welcome to TVNZ</h2>
        <p className={styles.content}>This is a placeholder for the main content area.</p>
      </main>
    </div>
  );
}
