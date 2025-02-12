import { useState, useEffect, useCallback } from 'react';
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

interface PurchaseOption {
  type: 'video' | 'series' | 'module';
  name: string;
  priceId: string;
  amount: number;
  currency: string;
}

export default function Main() {
  console.log('Main component rendering');
  const user = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseOptions, setPurchaseOptions] = useState<PurchaseOption[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [videoAccess, setVideoAccess] = useState<{ [key: number]: boolean }>({});

  console.log('User state:', user);
  console.log('Videos state:', videos);

  const checkVideoAccess = useCallback(async (videoId: number) => {
    try {
      const response = await fetch(`/api/check-access?videoId=${videoId}&userId=${user.id}`);
      const data = await response.json();
      return data.hasAccess;
    } catch (error) {
      console.error('Error checking video access:', error);
      return false;
    }
  }, [user.id]);

  useEffect(() => {
    console.log('useEffect running');
    let userDataFetched = false;
    let videosDataFetched = false;
  
    const fetchData = async () => {
      try {
        await Promise.all([
          fetchUserData().then(() => { 
            userDataFetched = true; 
            console.log('User data fetched successfully');
          }),
          fetchVideos().then(() => { 
            videosDataFetched = true; 
            console.log('Videos fetched successfully');
          })
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        console.log('Data fetching complete. User:', userDataFetched, 'Videos:', videosDataFetched);
        setDataLoaded(true);
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  const fetchUserData = useCallback(async () => {
    console.log('Fetching user data');
    try {
      const response = await fetch('/api/user');
      const data = await response.json();
      console.log('User data fetched:', data);
      if (data.user) {
        dispatch(setUser(data.user));
        dispatch(setHasPaymentMethod(data.user.hasPaymentMethod));
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, [dispatch, router]);  

  const fetchVideos = useCallback(async () => {
    console.log('Fetching videos');
    try {
      const response = await fetch('/api/videos');
      const data = await response.json();
      console.log('Raw video data:', data);
      if (data && data.videos && Array.isArray(data.videos)) {
        console.log('Setting videos:', data.videos);
        setVideos(data.videos);
      } else {
        console.error('Unexpected video data structure:', data);
        setVideos([]);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setVideos([]);
    }
  }, []);
  

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

    // Separate useEffect for checking video access
    useEffect(() => {
      const checkAllVideoAccess = async () => {
        if (videos.length > 0 && user.id) {
          const accessPromises = videos.map(async (video) => {
            const hasAccess = await checkVideoAccess(video.id);
            return { [video.id]: hasAccess };
          });
          
          const accessResults = await Promise.all(accessPromises);
          const newVideoAccess = Object.assign({}, ...accessResults);
          setVideoAccess(newVideoAccess);
        }
      };
  
      checkAllVideoAccess();
    }, [videos, user.id, checkVideoAccess]);

    const handleVideoClick = async (video: Video) => {
      // Recheck access before navigating
      const hasAccess = await checkVideoAccess(video.id);
      
      if (video.is_premium && !hasAccess) {
        setSelectedVideo(video);
        const options = await fetchPurchaseOptions(video.id);
        setPurchaseOptions(options);
        setShowPurchaseModal(true);
      } else {
        router.push(`/video?id=${video.id}`);
      }
    };    

    const fetchPurchaseOptions = useCallback(async (videoId: number) => {
      try {
        const response = await fetch(`/api/purchase-options?videoId=${videoId}&userId=${user.id}`);
        const data = await response.json();
        return data.purchaseOptions;
      } catch (error) {
        console.error('Error fetching purchase options:', error);
        return [];
      }
    }, [user.id]);
  
    const handlePurchase = async (option: PurchaseOption) => {
      if (!selectedVideo) {
        console.error('No video selected for purchase');
        return;
      }
    
      try {
        if (!user.hasPaymentMethod) {
          // Redirect to add payment method
          const checkoutResponse = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              returnUrl: `${window.location.origin}/main?action=purchase&videoId=${selectedVideo.id}&type=${option.type}`,
              cancelUrl: `${window.location.origin}/main`,
            }),
          });
    
          const checkoutData = await checkoutResponse.json();
    
          if (checkoutData.url) {
            window.location.href = checkoutData.url;
            return; // Exit the function here as we're redirecting
          } else {
            throw new Error('No checkout URL returned');
          }
        }
    
        // If we have a payment method, proceed with the purchase
        const response = await fetch('/api/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            priceId: option.priceId,
            videoId: selectedVideo.id,
            type: option.type,
            name: option.name
          }),
        });
    
        const data = await response.json();
    
        if (data.success) {
          setShowPurchaseModal(false);
          router.push(`/video?id=${selectedVideo.id}`);
        } else {
          throw new Error(data.error || 'Purchase failed');
        }
      } catch (error) {
        console.error('Error processing purchase:', error);
        alert('Failed to process purchase. Please try again.');
      }
    };    

    const handleDirectPurchase = useCallback(async (videoId: string, type: 'video' | 'series' | 'module') => {
      const video = videos.find(v => v.id.toString() === videoId);
      if (!video) return;
    
      const hasAccess = await checkVideoAccess(video.id);
      
      if (video.is_premium && !hasAccess) {
        setSelectedVideo(video);
        const options = await fetchPurchaseOptions(video.id);
        const option = options.find(o => o.type === type);
        
        if (option) {
          await handlePurchase(option);
        } else {
          console.error(`No purchase option found for type: ${type}`);
        }
      } else {
        router.push(`/video?id=${video.id}`);
      }
    }, [videos, checkVideoAccess, fetchPurchaseOptions, handlePurchase, router]);

  useEffect(() => {
    const { action, videoId, type } = router.query;
    
    if (action === 'purchase' && typeof videoId === 'string' && typeof type === 'string') {
      handleDirectPurchase(videoId, type as 'video' | 'series' | 'module');
    }
  }, [router.query, handleDirectPurchase]);
  
  if (!dataLoaded || loading) {
    return <div>Loading...</div>;
  }
  
  if (!user.email) {
    console.log('User email not available, returning null');
    return null;
  }
  
  console.log('Rendering main content');

  return (
    <div className={styles.container}>
      <TopBar userEmoji={user.emoji} onLogout={handleLogout} />
      <main className={styles.main}>
      <div className={styles.videoGrid}>
          {Array.isArray(videos) ? (
            videos.map((video) => (
              <div key={video.id} className={styles.videoCard} onClick={() => handleVideoClick(video)}>
                <div className={styles.videoPreview}>
                  <img 
                    src={`https://img.youtube.com/vi/${video.youtube_id}/0.jpg`} 
                    alt={video.title} 
                    className={styles.previewImage}
                    loading="lazy"
                  />
                  {video.is_premium && (
                    <span className={`${styles.badge} ${videoAccess[video.id] ? styles.accessBadge : styles.premiumBadge}`}>
                      {videoAccess[video.id] ? 'Access' : 'Premium'}
                    </span>
                  )}
                </div>
                <h3 className={styles.videoTitle}>{video.title}</h3>
              </div>
            ))
          ) : (
            <p>No videos available</p>
          )}
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
                  onClick={() => handlePurchase(option)}
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