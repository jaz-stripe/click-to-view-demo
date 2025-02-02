import { NextApiRequest, NextApiResponse } from 'next';
import { createStripeCustomer, createCheckoutSession } from '../../lib/stripe';
import { getDb } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const db = await getDb();
    const userEmail = req.cookies.userEmail;
    
    console.log('Starting checkout session creation for user:', userEmail);

    if (!userEmail) {
      console.log('User not authenticated');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
      const user = await db.get('SELECT * FROM users WHERE email = ?', [userEmail]);
      
      if (!user) {
        console.log('User not found in database');
        return res.status(404).json({ error: 'User not found' });
      }

      console.log('User found:', user);

      if (!user.stripeCustomerId) {
        console.log('Creating new Stripe customer');
        const customer = await createStripeCustomer(userEmail);
        await db.run('UPDATE users SET stripeCustomerId = ? WHERE email = ?', [customer.id, userEmail]);
        user.stripeCustomerId = customer.id;
        console.log('Stripe customer created:', customer.id);
      }

      console.log('Creating checkout session for Stripe customer:', user.stripeCustomerId);
      const session = await createCheckoutSession(user.stripeCustomerId);
      
      if (session && session.url) {
        console.log('Checkout session created successfully');
        res.status(200).json({ url: session.url });
      } else {
        console.error('Stripe session creation failed:', session);
        res.status(500).json({ error: 'Failed to create Stripe checkout session' });
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: 'Error creating checkout session', details: error.message });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
