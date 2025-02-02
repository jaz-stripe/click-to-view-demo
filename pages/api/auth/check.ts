import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userEmail = req.cookies.userEmail;

  if (userEmail) {
    try {
      const db = await getDb();
      const user = await db.get('SELECT email, emoji FROM users WHERE email = ?', [userEmail]);
      if (user) {
        res.status(200).json({ authenticated: true, email: user.email, emoji: user.emoji });
      } else {
        res.status(200).json({ authenticated: false });
      }
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ authenticated: false, error: 'Server error' });
    }
  } else {
    res.status(200).json({ authenticated: false });
  }
}
