import Database from 'better-sqlite3';

const db = new Database('./mydb.sqlite', { verbose: console.log });

// Initialize the database with tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    firstName TEXT,
    lastName TEXT,
    birthYear INTEGER
  )
`);

export default db;

