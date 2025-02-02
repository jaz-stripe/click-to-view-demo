import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { firstName, lastName, email, password, emoji } = req.body

    try {
      const db = await getDb()
      await db.run(
        'INSERT INTO users (firstName, lastName, email, password, emoji) VALUES (?, ?, ?, ?, ?)',
        [firstName, lastName, email, password, emoji]
      )
      
      res.setHeader('Set-Cookie', `userEmail=${email}; Path=/; HttpOnly`);
      
      res.status(200).json({ success: true, message: 'User registered and logged in successfully', email })
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error registering user' })
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' })
  }
}
