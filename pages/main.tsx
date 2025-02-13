import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import TopBar from '../components/TopBar';
import { RootState } from '../store';
import { setUser, setHasPaymentMethod } from '../slices/userSlice';
import { useSimplified } from '../components/SimplifiedContext';
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

function capitalizeFirstLetter(val) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
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
  const { isSimplified } = useSimplified();

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

  const fetchUserData = useCallback(async () => {
    console.log('Fetching user data');
    try {
      const response = await fetch('/api/user');
      const data = await response.json();
      console.log('User data fetched:', data);
      if (data.user) {
        dispatch(setUser(data.user));
        dispatch(setHasPaymentMethod(data.user.hasPaymentMethod));
        return data.user;
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    return null;
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
  
  useEffect(() => {
    console.log('useEffect running');
    let userDataFetched = false;
    let videosDataFetched = false;
  
    const fetchData = async () => {
      try {
        const userData = await fetchUserData();
        userDataFetched = !!userData;
        console.log('User data fetched successfully', userData);
  
        if (userDataFetched) {
          const videosData = await fetchVideos();
          videosDataFetched = !!videosData;
          console.log('Videos fetched successfully', videosData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        console.log('Data fetching complete. User:', userDataFetched, 'Videos:', videosDataFetched);
        setDataLoaded(true);
        setLoading(false);
      }
    };
  
    fetchData();
  }, [fetchUserData, fetchVideos]);

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
      console.log("handleVideoClick called for video:", video.id);
      const hasAccess = await checkVideoAccess(video.id);
      console.log("Video access:", hasAccess);
      
      if (video.is_premium && !hasAccess) {
        setSelectedVideo(video);
        const options = await fetchPurchaseOptions(video.id, isSimplified);
        console.log("Purchase options:", options);
        setPurchaseOptions(options);
        setShowPurchaseModal(true);
      } else {
        console.log("Navigating to video page");
        router.push(`/video?id=${video.id}`);
      }
    };

    const fetchPurchaseOptions = useCallback(async (videoId: number, simplified: boolean) => {
      try {
        const response = await fetch(`/api/purchase-options?videoId=${videoId}&userId=${user.id}&simplified=${simplified}`);
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
          // Store purchase intent with all necessary information, including user ID
          localStorage.setItem('pendingPurchase', JSON.stringify({
            userId: user.id,
            videoId: selectedVideo.id,
            videoTitle: selectedVideo.title,
            type: option.type,
            priceId: option.priceId,
            name: option.name,
            isSimplified: isSimplified
          }));
    
          // Redirect to add payment method
          const checkoutResponse = await fetch(isSimplified ? '/api/create-checkout-session-simple' : '/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              returnUrl: `${window.location.origin}/main?action=purchase`,
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
        await processPurchase({
          userId: user.id,
          videoId: selectedVideo.id,
          videoTitle: selectedVideo.title,
          type: option.type,
          priceId: option.priceId,
          name: option.name,
          isSimplified: isSimplified
        });
      } catch (error) {
        console.error('Error processing purchase:', error);
        alert('Failed to process purchase. Please try again.');
      }
    };
    
    
    const processPurchase = async (purchaseData: {
      userId: string;
      videoId: number;
      videoTitle: string;
      type: string;
      priceId: string;
      name: string;
      isSimplified: boolean;
    }) => {
      console.log('Processing purchase:', purchaseData);
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseData),
      });
    
      const data = await response.json();
    
      if (data.success) {
        setShowPurchaseModal(false);
        router.push(`/video?id=${purchaseData.videoId}`);
      } else {
        throw new Error(data.error || 'Purchase failed');
      }
    };    

    useEffect(() => {
      const { action } = router.query;
      
      const processPendingPurchase = async () => {
        if (action === 'purchase' && user.email) {  // Only proceed if user data is available
          const pendingPurchaseString = localStorage.getItem('pendingPurchase');
          if (pendingPurchaseString) {
            const pendingPurchase = JSON.parse(pendingPurchaseString);
            await processPurchase({
              ...pendingPurchase,
              userId: user.id,  // Use the current user ID
              isSimplified: isSimplified
            });
            localStorage.removeItem('pendingPurchase');
          }
        }
      };
    
      if (dataLoaded) {
        processPendingPurchase();
      }
    }, [router.query, user, dataLoaded, isSimplified]);
  
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
          title={"Purchase premium content"}
          onClose={() => setShowPurchaseModal(false)}
        >
          {!user.hasPaymentMethod && (
            <p className={styles.paymentMethodInfo}>
             {isSimplified ? (
                "On purchase you will be redircted you to input, validate and store your payment details. Managing your payment methods, purchases and invoices will be easy via the 'Manage my payments' portal here. You will be charged immediatly for your usage of TVNZ+ premium purchases."
              ) : (
                "On purchasing you will be redirected to input, validate and store your payment details. Managing your payment methods, purchases and invoices will be easy via the 'Manage my payments' portal in your account settings. You will be billed monthly for your usage of TVNZ+ premium content."
              )}
            </p>
          )}
          <div className={styles.purchaseOptions}>
            {purchaseOptions.map((option) => (
              <div key={option.priceId} className={styles.purchaseOption}>
                <span className={styles.optionText}>
                  {option.type === 'video' && `Buy '${selectedVideo.title}'`}
                  {option.type === 'series' && `Season pass for ${option.name}`}
                  {option.type === 'module' && `Subscribe to TVNZ ${capitalizeFirstLetter(option.name)}`}
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