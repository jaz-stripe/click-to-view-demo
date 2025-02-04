import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const db = await getDb();
      
      // Fetch all videos from the database
      const videos = await db.all('SELECT id, title, youtube_id, is_premium FROM videos');
      
      // Send the videos as a JSON response
      res.status(200).json({ videos });
    } catch (error) {
      console.error('Error fetching videos:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    // If the request method is not GET, return an error
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// const checkAccess = async () => {
//     try {
//       const response = await fetch(`/api/check-access?videoId=${id}&userId=${user.id}`);
//       const data = await response.json();
//       setHasAccess(data.hasAccess);
//     } catch (error) {
//       console.error('Error checking access:', error);
//     }
//   };
  