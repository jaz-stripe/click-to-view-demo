// create-checkout-session-simple.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../lib/db';
import { createStripeCustomer, createCheckoutSession } from '../../lib/stripe';

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
        console.error('Detailed error in create-checkout-session-simple:', err);
        if (err.response) {
          console.error('Stripe error response:', err.response.data);
        }
        res.status(500).json({ error: 'Failed to create checkout session', details: err.message });
      }
    } else {
      res.setHeader('Allow', 'POST');
      res.status(405).end('Method Not Allowed');
    }
}
