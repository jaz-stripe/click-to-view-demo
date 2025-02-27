import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/db';
import { hasValidPaymentMethod } from '../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const db = await getDb();
    const userEmail = req.cookies.userEmail;

    if (!userEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
      const user = await db.get('SELECT * FROM users WHERE email = ?', [userEmail]);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let hasPaymentMethod = false;

      if (user.stripeCustomerId) {
        hasPaymentMethod = await hasValidPaymentMethod(user.stripeCustomerId);
        
        // Update the database if the status has changed
        if (hasPaymentMethod !== user.hasPaymentMethod) {
          await db.run('UPDATE users SET hasPaymentMethod = ? WHERE email = ?', [hasPaymentMethod, userEmail]);
        }
      }

      res.status(200).json({ hasPaymentMethod });
    } catch (error) {
      console.error('Error verifying payment method:', error);
      res.status(500).json({ error: 'Error verifying payment method' });
    }
  } else {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
  }
}
