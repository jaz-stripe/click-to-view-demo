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
      emoji TEXT
    )
  `);
}

initializeDb();

export async function getDb() {
  if (!db) await initializeDb();
  return db;
}
