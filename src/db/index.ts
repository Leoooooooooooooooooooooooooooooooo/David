import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id       TEXT PRIMARY KEY,
      guild_id      TEXT NOT NULL,
      xp            INTEGER NOT NULL DEFAULT 0,
      level         INTEGER NOT NULL DEFAULT 1,
      status        INTEGER NOT NULL DEFAULT 0,
      sanity        INTEGER NOT NULL DEFAULT 100,
      temperature   INTEGER NOT NULL DEFAULT 72,
      deaths        INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMP DEFAULT NOW(),
      updated_at    TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('Database initialized.');
}

export async function getOrCreateUser(userId: string, guildId: string) {
  const res = await pool.query(
    `INSERT INTO users (user_id, guild_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [userId, guildId]
  );
  return res.rows[0];
}

export async function addXp(userId: string, guildId: string, amount: number) {
  await getOrCreateUser(userId, guildId);

  const res = await pool.query(
    `UPDATE users
     SET xp = xp + $1,
         level = FLOOR((xp + $1) / 100) + 1,
         updated_at = NOW()
     WHERE user_id = $2
     RETURNING *`,
    [amount, userId]
  );
  return res.rows[0];
}

export async function addStatus(userId: string, guildId: string, amount: number) {
  await getOrCreateUser(userId, guildId);

  const res = await pool.query(
    `UPDATE users
     SET status = status + $1,
         updated_at = NOW()
     WHERE user_id = $2
     RETURNING *`,
    [amount, userId]
  );
  return res.rows[0];
}

export async function loseSanity(userId: string, guildId: string, amount: number) {
  await getOrCreateUser(userId, guildId);

  // Clamp sanity to 0 minimum
  const res = await pool.query(
    `UPDATE users
     SET sanity = GREATEST(0, sanity - $1),
         updated_at = NOW()
     WHERE user_id = $2
     RETURNING *`,
    [amount, userId]
  );
  return res.rows[0];
}

export async function killUser(userId: string) {
  const res = await pool.query(
    `UPDATE users
     SET xp = 0,
         level = 1,
         status = 0,
         sanity = 100,
         deaths = deaths + 1,
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING *`,
    [userId]
  );
  return res.rows[0];
}

export async function getLeaderboard(guildId: string) {
  const res = await pool.query(
    `SELECT user_id, xp, level, status, sanity, deaths
     FROM users
     WHERE guild_id = $1
     ORDER BY xp DESC
     LIMIT 10`,
    [guildId]
  );
  return res.rows;
}
