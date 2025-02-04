import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe';
import { getDb } from '../../lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

      if (!user.stripeCustomerId) {
        const customer = await stripe.customers.create({ email: userEmail });
        await db.run('UPDATE users SET stripeCustomerId = ? WHERE email = ?', [customer.id, userEmail]);
        user.stripeCustomerId = customer.id;
      }

      // Extract the returnUrl and cancelUrl from the request body
      const { returnUrl, cancelUrl } = req.body;

      // Create Checkout Sessions from body params.
      const session = await stripe.checkout.sessions.create({
        mode: 'setup',
        payment_method_types: ['card'],
        customer: user.stripeCustomerId,
        success_url: returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/account`,
        cancel_url: cancelUrl || returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/account`,
      });

      res.status(200).json(session);
    } catch (err: any) {
      res.status(err.statusCode || 500).json(err.message);
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
