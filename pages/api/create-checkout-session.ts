import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../lib/db';
import { createCheckoutSession } from '../../lib/stripe';
import { getOrCreateFreeSubscription, createStripeCustomer, createStripeCustomerSubscription } from '../../lib/stripe'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
      try {
        const db = await getDb();
        const userEmail = req.cookies.userEmail;
        
        if (!userEmail) {
          return res.status(401).json({ error: 'User not authenticated' });
        }
  
        const user = await db.get('SELECT * FROM users WHERE email = ?', [userEmail]);
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
  
        let stripeCustomerId = user.stripeCustomerId;
  
        if (!stripeCustomerId) {
          // Create a new Stripe customer
          const customer = await createStripeCustomer(userEmail);
          stripeCustomerId = customer.id;
  
          // Update the user in the database with the new Stripe customer ID
          await db.run('UPDATE users SET stripeCustomerId = ? WHERE email = ?', [stripeCustomerId, userEmail]);
        }

        // Check if there is a Stripe user and no main subscription
        const stripeMainSubscription = await db.get('SELECT * from user_subscriptions where user_id = ? AND is_main = 1', [user.id]);
        if(stripeCustomerId && !stripeMainSubscription) {
          try {
            console.log('Before calling getOrCreateFreeSubscription');
            const { priceId } = await getOrCreateFreeSubscription(db);
            console.log('After getOrCreateFreeSubscription, priceId:', priceId);
          
            // Create a subscription for the customer
            console.log('Creating Stripe subscription');
            const subscription = await createStripeCustomerSubscription(stripeCustomerId, priceId);
            console.log(`Free subscription created for customer ${stripeCustomerId}: ${subscription.id}`);
            
            // Save the subscription ID in the user_subscriptions table
            await db.run('INSERT INTO user_subscriptions (user_id, subscription_id, is_main) VALUES (?, ?, 1)', [user.id, subscription.id]);
          } catch (subscriptionError) {
            console.error('Error in subscription creation process:', subscriptionError);
            // Instead of continuing, we should return an error response
            return res.status(500).json({ error: 'Failed to create free subscription', details: subscriptionError.message });
          }
        }

      // Extract the returnUrl and cancelUrl from the request body
      const { returnUrl, cancelUrl } = req.body;

      if (!returnUrl || !cancelUrl) {
        return res.status(400).json({ error: 'Missing returnUrl or cancelUrl' });
      }

      // Create Checkout Sessions from body params.
      const session = await createCheckoutSession(stripeCustomerId, returnUrl, cancelUrl)

      // Only return the URL
      res.status(200).json({ url: session.url });
    } catch (err: any) {
      console.error('Detailed error in create-checkout-session:', err);
      if (err.response) {
        console.error('Stripe error response:', err.response.data);
      }
      rres.status(500).json({ error: 'Failed to create checkout session', details: err.message });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
