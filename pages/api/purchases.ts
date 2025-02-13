// purchases.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/db';
import { addVideoToSubscription, addSeasonToSubscription, createModuleSubscription, createImmediatePurchase } from '../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { userId, priceId, videoId, type, name, isSimplified } = req.body;
    console.log(`Purchasing for userId: ${userId}, priceId: ${priceId}, videoId: ${videoId}, type: ${type}, name: ${name}, isSimplified: ${isSimplified}`);

    try {
      const db = await getDb();
      const user = await db.get('SELECT stripeCustomerId FROM users WHERE id = ?', [userId]);

      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ error: 'User not found or has no Stripe customer ID' });
      }

      let result;

      if (isSimplified) {
        result = await createImmediatePurchase(user.stripeCustomerId, priceId, videoId, name);
        await db.run('INSERT INTO user_purchases (user_id, video_id) VALUES (?, ?)', [userId, videoId]);
      } else {

        // Retrieve the main subscription ID for the user
        const userSubscription = await db.get('SELECT subscription_id FROM user_subscriptions WHERE user_id = ? AND is_main = 1', [userId]);
        
        if (!userSubscription || !userSubscription.subscription_id) {
            return res.status(400).json({ error: 'User has no active main subscription' });
        }

        const mainSubscriptionId = userSubscription.subscription_id;

        let result;

        switch (type) {
            case 'video':
            // Add the video to the main subscription
            result = await addVideoToSubscription(mainSubscriptionId, priceId);
            // Update the user_purchases table
            await db.run('INSERT INTO user_purchases (user_id, video_id) VALUES (?, ?)', [userId, videoId]);
            break;

            case 'series':
            // Add the series as a subscription item to the main subscription
            result = await addSeasonToSubscription(mainSubscriptionId, priceId);
            // Update the user_purchases table
            await db.run('INSERT INTO user_purchases (user_id, series_id) VALUES (?, (SELECT id FROM series WHERE name = ?))', [userId, name]);
            break;

            case 'module':
            // Create a new subscription for the module
            result = await createModuleSubscription(user.stripeCustomerId, priceId, name);
            // Store the new subscription in user_subscriptions
            await db.run('INSERT INTO user_subscriptions (user_id, module_id, subscription_id, is_main) VALUES (?, (SELECT id FROM modules WHERE name = ?), ?, 0)', [userId, name, result.id]);
            break;

            default:
            return res.status(400).json({ error: 'Invalid purchase type' });
        }
    }

      res.status(200).json({ success: true, result });
    } catch (error) {
      console.error('Error processing purchase:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}

