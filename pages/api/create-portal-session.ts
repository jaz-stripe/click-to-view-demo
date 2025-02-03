import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getDb } from '../../lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = await getDb();
  const userEmail = req.cookies.userEmail;

  if (!userEmail) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const user = await db.get('SELECT stripeCustomerId FROM users WHERE email = ?', [userEmail]);

    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ error: 'User has no associated Stripe customer' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account`,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Error creating portal session' });
  }
}
