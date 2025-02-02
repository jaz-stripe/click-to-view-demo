import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector, useDispatch } from 'react-redux';
import TopBar from '../components/TopBar';
import { RootState } from '../store';
import { setUser, setHasPaymentMethod } from '../slices/userSlice';
import styles from '../styles/Main.module.css';

export default function Main() {
  const user = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user');
      const data = await response.json();
      if (data.user) {
        dispatch(setUser(data.user));
        dispatch(setHasPaymentMethod(data.user.hasPaymentMethod));
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        dispatch(setUser({ email: '', stripeCustomerId: null, hasPaymentMethod: false }));
        router.push('/');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user.email) {
    return null;
  }

  return (
    <div className={styles.container}>
      <TopBar userEmoji={user.emoji} onLogout={handleLogout} />
      <main className={styles.main}>
        <h1 className={styles.title}>Welcome to TVNZ+</h1>
        <p className={styles.description}>
          Explore our wide range of content, including sports, news, and premium shows.
        </p>
        <div className={styles.grid}>
          <a href="#" className={styles.card}>
            <h2>Sports &rarr;</h2>
            <p>Watch live and on-demand sports events.</p>
          </a>
          <a href="#" className={styles.card}>
            <h2>News &rarr;</h2>
            <p>Stay updated with the latest news and current affairs.</p>
          </a>
          <a href="#" className={styles.card}>
            <h2>Premium Content &rarr;</h2>
            <p>Enjoy exclusive shows and movies.</p>
          </a>
          <a href="#" className={styles.card}>
            <h2>Categories &rarr;</h2>
            <p>Browse content by genre and interest.</p>
          </a>
        </div>
        {!user.hasPaymentMethod && (
          <div className={styles.paymentPrompt}>
            <p>Add a payment method to access premium content!</p>
            <button onClick={() => router.push('/account')} className={styles.addPaymentButton}>
              Add Payment Method
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
