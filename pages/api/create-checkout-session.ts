import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe';
import { getDb } from '../../lib/db';
import { getOrCreateFreeSubscription } from '../../lib/stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});

function getNextMonthFirstDay() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() / 1000;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let db;
  if (req.method === 'POST') {
    try {
      db = await getDb();
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
        const customer = await stripe.customers.create({ email: userEmail });
        stripeCustomerId = customer.id;

        // Update the user in the database with the new Stripe customer ID
        await db.run('UPDATE users SET stripeCustomerId = ? WHERE email = ?', [stripeCustomerId, userEmail]);

        try {
          console.log('Before calling getOrCreateFreeSubscription');
          const { priceId } = await getOrCreateFreeSubscription(db);
          console.log('After getOrCreateFreeSubscription, priceId:', priceId);
        
          // Create a subscription for the customer
          console.log('Creating Stripe subscription');
          const subscription = await stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [{ price: priceId }],
            billing_cycle_anchor: getNextMonthFirstDay(),
            proration_behavior: 'none',
          });
        
          console.log(`Free subscription created for customer ${stripeCustomerId}: ${subscription.id}`);
        } catch (subscriptionError) {
          console.error('Error in subscription creation process:', subscriptionError);
          // Instead of continuing, we should return an error response
          return res.status(500).json({ error: 'Failed to create free subscription', details: subscriptionError.message });
        }
      }

      // Extract the returnUrl and cancelUrl from the request body
      const { returnUrl, cancelUrl } = req.body;

      // Create Checkout Sessions from body params.
      const session = await stripe.checkout.sessions.create({
        mode: 'setup',
        payment_method_types: ['card'],
        customer: stripeCustomerId,
        success_url: returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/account`,
        cancel_url: cancelUrl || returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/account`,
      });

      // Only return the URL
      res.status(200).json({ url: session.url });
    } catch (err: any) {
      console.error('Detailed error in create-checkout-session:', err);
      if (err.response) {
        console.error('Stripe error response:', err.response.data);
      }
      res.status(500).json({ error: err.message, details: err.response?.data });
    } finally {
      if (db) {
        await db.close();
      }
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
