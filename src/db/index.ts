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
      temperature   BIGINT NOT NULL DEFAULT 293,
      deaths        INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMP DEFAULT NOW(),
      updated_at    TIMESTAMP DEFAULT NOW(),
      money               INTEGER NOT NULL DEFAULT 0,
      dryness             INTEGER NOT NULL DEFAULT 50,
      is_sick             BOOLEAN NOT NULL DEFAULT FALSE,
      insurance_paid      BOOLEAN NOT NULL DEFAULT FALSE,
      insurance_paid_at   TIMESTAMP,
      hunger              INTEGER NOT NULL DEFAULT 100,
      weight              INTEGER NOT NULL DEFAULT 50
    );
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS money INTEGER NOT NULL DEFAULT 0;`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS dryness INTEGER NOT NULL DEFAULT 50;`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_sick BOOLEAN NOT NULL DEFAULT FALSE;`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS insurance_paid BOOLEAN NOT NULL DEFAULT FALSE;`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS insurance_paid_at TIMESTAMP;`).catch(() => {});  
  await pool.query(`ALTER TABLE users ALTER COLUMN temperature TYPE BIGINT;`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS hunger INTEGER NOT NULL DEFAULT 100;`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS weight INTEGER NOT NULL DEFAULT 50;`).catch(() => {});

  console.log('Database initialized.');
}

function randomTemperature(): number {
  return Math.floor(Math.random() * 4294967296) - 2147483648;
}

export async function randomizeTemperature(userId: string) {
  const temp = randomTemperature();
  const res = await pool.query(
    `UPDATE users SET temperature = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *`,
    [temp, userId]
  );
  return res.rows[0];
}

export async function regenSanityAll(): Promise<void> {
  await pool.query(`
    UPDATE users
    SET sanity = LEAST(100, sanity + 1),
        updated_at = NOW()
    WHERE sanity < 100
  `);
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

export async function moisturize(userId: string) {
  const res = await pool.query(
    `UPDATE users SET dryness = LEAST(100, dryness + 20), updated_at = NOW() WHERE user_id = $1 RETURNING *`,
    [userId]
  );
  return res.rows[0];
}

export async function spendMoney(userId: string, amount: number) {
  const res = await pool.query(
    `UPDATE users SET money = GREATEST(0, money - $1), updated_at = NOW() WHERE user_id = $2 RETURNING *`,
    [amount, userId]
  );
  return res.rows[0];
}

export async function payInsurance(userId: string) {
  const res = await pool.query(
    `UPDATE users SET insurance_paid = TRUE, insurance_paid_at = NOW(), updated_at = NOW() WHERE user_id = $1 RETURNING *`,
    [userId]
  );
  return res.rows[0];
}

export async function decreaseDrynessAll(): Promise<void> {
  await pool.query(`
    UPDATE users SET dryness = GREATEST(0, dryness - 1), updated_at = NOW() WHERE dryness > 0
  `);
}