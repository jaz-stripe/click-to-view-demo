import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TopBar from '../components/TopBar';
import styles from '../styles/Video.module.css';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface Video {
  id: number;
  title: string;
  youtube_id: string;
  is_premium: boolean;
}

export default function VideoPage() {
  const router = useRouter();
  const { id } = router.query;
  const [video, setVideo] = useState<Video | null>(null);
  const user = useSelector((state: RootState) => state.user);

  useEffect(() => {
    if (id) {
      fetchVideoDetails();
    }
  }, [id]);

  const fetchVideoDetails = async () => {
    try {
      const response = await fetch(`/api/video?id=${id}`);
      if (response.ok) {
        const data = await response.json();
        setVideo(data.video);
      } else {
        console.error('Failed to fetch video details');
      }
    } catch (error) {
      console.error('Error fetching video details:', error);
    }
  };

  const handleBackClick = () => {
    router.push('/main');
  };

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

  if (!video) {
    return (
      <div>
        <TopBar userEmoji={user.emoji} onLogout={handleLogout} />
        <div className={styles.pageContainer}>
          <div className={styles.container}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar userEmoji={user.emoji} onLogout={handleLogout} />
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <button onClick={handleBackClick} className={styles.backButton}>
            Back to Main
          </button>
          <h1 className={styles.title}>{video.title}</h1>
          <div className={styles.videoWrapper}>
            <iframe
              width="560"
              height="315"
              src={`https://www.youtube.com/embed/${video.youtube_id}`}
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
}
