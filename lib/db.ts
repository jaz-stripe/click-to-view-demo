import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db: any;

async function initializeDb() {
  db = await open({
    filename: './mydb.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT,
      lastName TEXT,
      email TEXT UNIQUE,
      password TEXT,
      emoji TEXT,
      stripeCustomerId TEXT,
      hasPaymentMethod BOOLEAN DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      youtube_id TEXT NOT NULL,
      is_premium BOOLEAN NOT NULL,
      stripe_product_id TEXT,
      stripe_price_id TEXT,
      type TEXT,
      series TEXT
    );

    CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      stripe_product_id TEXT NOT NULL,
      stripe_price_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      stripe_product_id TEXT NOT NULL,
      stripe_price_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      video_id INTEGER,
      series_id INTEGER,
      purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (video_id) REFERENCES videos(id),
      FOREIGN KEY (series_id) REFERENCES series(id)
    );

    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      module_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      end_date TIMESTAMP,
      FOREIGN KEY (module_id) REFERENCES modules(id)
    );
  `);
}

initializeDb();

export async function getDb() {
  if (!db) await initializeDb();
  return db;
}
