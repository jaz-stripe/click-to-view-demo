import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db: any;

async function initializeDb() {
  db = await open({
    filename: './mydb.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      youtube_id TEXT NOT NULL,
      is_premium BOOLEAN NOT NULL,
      stripe_product_id TEXT,
      type TEXT,
      series TEXT
    );

    CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      stripe_product_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      stripe_product_id TEXT NOT NULL
    );
  `);
}

initializeDb();

export async function getDb() {
  if (!db) await initializeDb();
  return db;
}
