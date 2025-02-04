import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import TopBar from '../components/TopBar';
import { RootState } from '../store';
import { setUser, setHasPaymentMethod } from '../slices/userSlice';
import styles from '../styles/Main.module.css';
import Modal from '../components/Modal';

interface Video {
  id: number;
  title: string;
  youtube_id: string;
  is_premium: boolean;
}

export default function Main() {
  const user = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseOptions, setPurchaseOptions] = useState<PurchaseOption[]>([]);

  useEffect(() => {
    fetchUserData();
    fetchVideos();
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

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos');
      const data = await response.json();
      setVideos(data.videos);
    } catch (error) {
      console.error('Error fetching videos:', error);
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

  const handleVideoClick = async (video: Video) => {
    if (video.is_premium) {
      setSelectedVideo(video);
      const options = await fetchPurchaseOptions(video.id);
      setPurchaseOptions(options);
      setShowPurchaseModal(true);
    } else {
      router.push(`/video?id=${video.id}`);
    }
  };

  const fetchPurchaseOptions = async (videoId: number) => {
    try {
      const response = await fetch(`/api/purchase-options?videoId=${videoId}&userId=${user.id}`);
      const data = await response.json();
      return data.purchaseOptions;
    } catch (error) {
      console.error('Error fetching purchase options:', error);
      return [];
    }
  };

  const handlePurchase = async (priceId: string) => {
    if (!selectedVideo) return;
  
    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, priceId, videoId: selectedVideo.id }),
      });
      const data = await response.json();
  
      if (data.needsPaymentMethod) {
        const checkoutResponse = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            returnUrl: data.returnUrl,
            cancelUrl: data.cancelUrl
          }),
        });
        const checkoutData = await checkoutResponse.json();
        if (checkoutData.url) {
          router.push(checkoutData.url);
        } else {
          throw new Error('No URL returned from checkout session creation');
        }
      } else if (data.success) {
        setShowPurchaseModal(false);
        router.push(`/video?id=${selectedVideo.id}`);
      }
    } catch (error) {
      console.error('Error processing purchase:', error);
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
        <div className={styles.videoGrid}>
          {videos.map((video) => (
            <div key={video.id} className={styles.videoCard} onClick={() => handleVideoClick(video)}>
              <h3>{video.title}</h3>
              {video.is_premium && (
                <span className={video.isPurchased ? styles.purchasedBadge : styles.premiumBadge}>
                  {video.isPurchased ? 'Purchased' : 'Premium'}
                </span>
              )}
            </div>
          ))}
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
      {showPurchaseModal && selectedVideo && (
        <Modal
          title={selectedVideo.title}
          onClose={() => setShowPurchaseModal(false)}
        >
          {!user.hasPaymentMethod && (
            <p className={styles.paymentMethodInfo}>
              On purchasing you will be redirected to input, validate and store your payment details. 
              Managing your payment methods, purchases and invoices will be easy via the "Manage my payments" 
              portal in your account settings. You will be billed monthly for your usage of TVNZ+ premium content.
            </p>
          )}
          <div className={styles.purchaseOptions}>
            {purchaseOptions.map((option) => (
              <div key={option.priceId} className={styles.purchaseOption}>
                <span className={styles.optionText}>
                  {option.type === 'video' && 'Watch this video forever'}
                  {option.type === 'series' && `Watch all videos in the ${option.name} season`}
                  {option.type === 'module' && `Watch all ${option.name} content for a month`}
                </span>
                <button
                  onClick={() => handlePurchase(option.priceId)}
                  className={styles.purchaseButton}
                >
                  ${(option.amount / 100).toFixed(2)}
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
