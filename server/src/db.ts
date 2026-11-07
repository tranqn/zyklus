import { DatabaseSync } from 'node:sqlite'

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    email_verified_at INTEGER,
    consent_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    user_agent TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS tokens (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('verify', 'reset')),
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS states (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    rev INTEGER NOT NULL,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  // friends and challenges (see social.ts)
  `CREATE TABLE IF NOT EXISTS summaries (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS invites (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS friendships (
    a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (a, b),
    CHECK (a < b)
  )`,
  `CREATE INDEX IF NOT EXISTS friendships_b ON friendships(b)`,
  `CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('goal', 'streak')),
    title TEXT NOT NULL,
    metric TEXT,
    target INTEGER,
    days INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS challenge_members (
    challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (challenge_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS challenge_members_user ON challenge_members(user_id)`,
]

export type DB = DatabaseSync

export function openDb(path: string): DB {
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA busy_timeout = 5000')
  for (const stmt of SCHEMA) db.exec(stmt)
  // migrations for databases created by earlier versions
  const cols = (db.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map((c) => c.name)
  if (!cols.includes('locale')) db.exec("ALTER TABLE users ADD COLUMN locale TEXT NOT NULL DEFAULT 'de'")
  return db
}

export interface UserRow {
  id: number
  email: string
  password_hash: string
  email_verified_at: number | null
  consent_at: number
  created_at: number
  locale: Locale
}

export type Locale = 'de' | 'en' | 'vi'
export const LOCALES: Locale[] = ['de', 'en', 'vi']
export const toLocale = (v: unknown): Locale => (LOCALES.includes(v as Locale) ? (v as Locale) : 'de')
