import https from 'https';
import { parse } from 'url';
import next from 'next';
import fs from 'fs';
import { getDb } from './lib/db.ts';
import dotenv from 'dotenv';
dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync('./localhost-key.pem'),
  cert: fs.readFileSync('./localhost.pem')
};

app.prepare().then(() => {
  // Initialize the database
  getDb().then(() => {
    console.log('Database initialized');

    https.createServer(httpsOptions, (req, res) => {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // Handle API routes
      if (pathname.startsWith('/api/')) {
        app.getRequestHandler()(req, res, parsedUrl);
      } else {
        handle(req, res, parsedUrl);
      }
    }).listen(3000, (err) => {
      if (err) throw err;
      console.log('> Ready on https://localhost:3000');
    });
  }).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
});
