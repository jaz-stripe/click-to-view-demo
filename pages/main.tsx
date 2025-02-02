import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopBar from '../components/TopBar';
import styles from '../styles/Main.module.css';

export default function Main() {
  const [userEmail, setUserEmail] = useState('');
  const [userEmoji, setUserEmoji] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();

        if (data.authenticated) {
          setUserEmail(data.email);
          setUserEmoji(data.emoji);
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        router.push('/');
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        router.push('/');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (!userEmail) return null;

  return (
    <div className={styles.container}>
      <TopBar userEmoji={userEmoji} onLogout={handleLogout} />
      <main className={styles.main}>
        <h2>Welcome, {userEmail}</h2>
        <p>This is where the main content of your application will go.</p>
      </main>
    </div>
  );
}
