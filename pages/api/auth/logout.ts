import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    res.setHeader('Set-Cookie', 'userEmail=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;');
    res.status(200).json({ success: true, message: 'Logged out successfully' })
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' })
  }
}
