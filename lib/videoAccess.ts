import { getDb } from './db';
import { retrievePrice } from './stripe';

interface PurchaseOption {
  type: 'video' | 'series' | 'module';
  name: string;
  priceId: string;
  amount: number;
  currency: string;
}

export async function checkUserAccess(videoId: number, userId: number): Promise<boolean> {
    const db = await getDb();
  
    // Get video details
    const video = await db.get('SELECT * FROM videos WHERE id = ?', [videoId]);
    if (!video) throw new Error('Video not found');

    // If the video is not premium, user always has access
    if (!video.is_premium) return true;

  // Check direct video purchase
  const videoPurchase = await db.get(
    'SELECT * FROM user_purchases WHERE user_id = ? AND video_id = ?',
    [userId, videoId]
  );
  if (videoPurchase) return true;

  // Check series purchase
  if (video.series) {
    const seriesPurchase = await db.get(
      'SELECT * FROM user_purchases WHERE user_id = ? AND series_id = (SELECT id FROM series WHERE name = ?)',
      [userId, video.series]
    );
    if (seriesPurchase) return true;
  }

  // Check module subscription
  if (video.type) {
    const moduleSubscription = await db.get(
      'SELECT * FROM user_subscriptions WHERE user_id = ? AND module_id = (SELECT id FROM modules WHERE name = ?)',
      [userId, video.type]
    );
    if (moduleSubscription) return true;
  }

  return false;
}

export async function getAvailablePurchaseOptions(videoId: number, userId: number, simplified: boolean = false): Promise<PurchaseOption[]> {
    const db = await getDb();
    const options: PurchaseOption[] = [];
  
    console.log(`Getting purchase options for videoId: ${videoId}, userId: ${userId}, simplified: ${simplified}`);
  
    // Get video details
    const video = await db.get('SELECT * FROM videos WHERE id = ?', [videoId]);
    console.log('Video details:', video);
    if (!video) throw new Error('Video not found');
  
    // If the video is not premium, return an empty array (it's free)
    if (!video.is_premium) {
      console.log('Video is not premium (free content)');
      return options;
    }
  
    // Check if user has already purchased this video
    const videoPurchase = await db.get(
      'SELECT * FROM user_purchases WHERE user_id = ? AND video_id = ?',
      [userId, videoId]
    );
    console.log('Video purchase:', videoPurchase);
  
    if (!videoPurchase && video.stripe_price_id) {
      console.log('Attempting to add video purchase option');
      try {
        const price = await retrievePrice(video.stripe_price_id);
        console.log('Retrieved price:', price);
        options.push({
          type: 'video',
          name: video.title,
          priceId: video.stripe_price_id,
          amount: price.unit_amount!,
          currency: price.currency
        });
      } catch (error) {
        console.error('Error retrieving video price:', error);
      }
    }
  
    if (!simplified) {
        console.log("This is not simplified, lets add all the options!")
        // Check series option
        if (video.series) {
        console.log('Checking series option:', video.series);
        const seriesPurchase = await db.get(
            'SELECT * FROM user_purchases WHERE user_id = ? AND series_id = (SELECT id FROM series WHERE name = ?)',
            [userId, video.series]
        );
        console.log('Series purchase:', seriesPurchase);
    
        if (!seriesPurchase) {
            const series = await db.get('SELECT * FROM series WHERE name = ?', [video.series]);
            console.log('Series details:', series);
            if (series && series.stripe_price_id) {
            try {
                const price = await retrievePrice(series.stripe_price_id);
                console.log('Retrieved series price:', price);
                options.push({
                type: 'series',
                name: video.series,
                priceId: series.stripe_price_id,
                amount: price.unit_amount!,
                currency: price.currency
                });
            } catch (error) {
                console.error('Error retrieving series price:', error);
            }
            }
        }
        }
    
        // Check module option
        if (video.type) {
        console.log('Checking module option:', video.type);
        const moduleSubscription = await db.get(
            'SELECT * FROM user_subscriptions WHERE user_id = ? AND module_id = (SELECT id FROM modules WHERE name = ?)',
            [userId, video.type]
        );
        console.log('Module subscription:', moduleSubscription);
    
        if (!moduleSubscription) {
            const module = await db.get('SELECT * FROM modules WHERE name = ?', [video.type]);
            console.log('Module details:', module);
            if (module && module.stripe_price_id) {
            try {
                const price = await retrievePrice(module.stripe_price_id);
                console.log('Retrieved module price:', price);
                options.push({
                type: 'module',
                name: video.type,
                priceId: module.stripe_price_id,
                amount: price.unit_amount!,
                currency: price.currency
                });
            } catch (error) {
                console.error('Error retrieving module price:', error);
            }
            }
        }
        }
    }
  
    console.log('Final purchase options:', options);
    return options;
  }
  
