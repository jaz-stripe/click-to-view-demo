import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email, password } = req.body

    try {
      const db = await getDb()
      const user = await db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password])

      if (user) {
        // User found, set a session cookie
        res.setHeader('Set-Cookie', `userEmail=${user.email}; Path=/; HttpOnly`);
        res.status(200).json({ success: true, email: user.email })
      } else {
        // User not found or incorrect password
        res.status(401).json({ success: false, message: 'Invalid email or password' })
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Server error' })
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' })
  }
}
