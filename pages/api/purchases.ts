import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/db';
import { addItemToSubscription } from '../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, priceId, videoId } = req.body;

  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.hasPaymentMethod) {
      await addItemToSubscription(user.stripe_subscription_id, priceId);
      await db.run('INSERT INTO user_purchases (user_id, video_id, stripe_price_id) VALUES (?, ?, ?)', [userId, videoId, priceId]);
      return res.status(200).json({ success: true });
    } else {
        const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/video?id=${videoId}`;
        const cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/main`;
        
        // Return information for creating a checkout session
        return res.status(200).json({ 
            needsPaymentMethod: true, 
            checkoutUrl: '/api/create-checkout-session',
            videoId: videoId,
            returnUrl: returnUrl,
            cancelUrl: cancelUrl
        });
    }
  } catch (error) {
    console.error('Error processing purchase:', error);
    return res.status(500).json({ error: 'Error processing purchase' });
  }
}
