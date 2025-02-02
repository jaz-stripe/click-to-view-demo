import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const db = await getDb();
    const userEmail = req.cookies.userEmail;

    if (!userEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
      const user = await db.get('SELECT id, email, firstName, lastName, emoji, stripeCustomerId, hasPaymentMethod FROM users WHERE email = ?', [userEmail]);
      
      if (user) {
        res.status(200).json({ user });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
  }
}
