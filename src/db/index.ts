import { Pool, types } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
types.setTypeParser(20, (val) => Number(val));

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
      money               BIGINT NOT NULL DEFAULT 0,
      dryness             INTEGER NOT NULL DEFAULT 50,
      is_sick             BOOLEAN NOT NULL DEFAULT FALSE,
      insurance_paid      BOOLEAN NOT NULL DEFAULT FALSE,
      insurance_paid_at   TIMESTAMP,
      hunger              INTEGER NOT NULL DEFAULT 100,
      weight              INTEGER NOT NULL DEFAULT 50,
      taxes_paid          BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS money INTEGER NOT NULL DEFAULT 0;`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS dryness INTEGER NOT NULL DEFAULT 50;`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_sick BOOLEAN NOT NULL DEFAULT FALSE;`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS insurance_paid BOOLEAN NOT NULL DEFAULT FALSE;`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS insurance_paid_at TIMESTAMP;`).catch(() => {});  
  await pool.query(`ALTER TABLE users ALTER COLUMN temperature TYPE BIGINT;`).catch(() => {});
  await pool.query(`ALTER TABLE users ALTER COLUMN money TYPE BIGINT;`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS hunger INTEGER NOT NULL DEFAULT 100;`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS weight INTEGER NOT NULL DEFAULT 50;`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS taxes_paid BOOLEAN NOT NULL DEFAULT FALSE;`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS promotion_level INTEGER NOT NULL DEFAULT 0;`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gamble_streak INTEGER NOT NULL DEFAULT 0;`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS david_fund (
      id      INTEGER PRIMARY KEY DEFAULT 1,
      total   BIGINT NOT NULL DEFAULT 0,
      CHECK (id = 1)
    );
    INSERT INTO david_fund (id, total) VALUES (1, 0) ON CONFLICT DO NOTHING;
  `);
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
  const user = res.rows[0];

  if (user.sanity <= 0) {
    const killed = await killUser(userId);
    return { ...killed, died: true };
  }

  return { ...user, died: false };
}

export async function killUser(userId: string) {
  const res = await pool.query(
    `UPDATE users
     SET xp = 0,
         level = 1,
         status = 0,
         sanity = 100,
         deaths = deaths + 1,
         hunger = 100,
         weight = 50,
         dryness = 50,
         money = 0,
         is_sick = FALSE,
         insurance_paid = FALSE,
         insurance_paid_at = NULL,
         promotion_level = 0,
         gamble_streak = 0,
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING *`,
    [userId]
  );
  return res.rows[0];
}

export async function promoteUser(userId: string) {
  const res = await pool.query(
    `UPDATE users SET promotion_level = promotion_level + 1, updated_at = NOW() WHERE user_id = $1 RETURNING *`,
    [userId]
  );
  return res.rows[0];
}

export async function demoteUser(userId: string) {
  const res = await pool.query(
    `UPDATE users SET promotion_level = GREATEST(promotion_level - 1, 0), updated_at = NOW() WHERE user_id = $1 RETURNING *`,
    [userId]
  );
  return res.rows[0];
}

export async function updateGambleStreak(userId: string, won: boolean) {
  const res = await pool.query(
    `UPDATE users
     SET gamble_streak = CASE WHEN $2 THEN GREATEST(0, gamble_streak) + 1 ELSE LEAST(0, gamble_streak) - 1 END,
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING *`,
    [userId, won]
  );
  return res.rows[0];
}

export async function getLeaderboard(guildId: string) {
  const res = await pool.query(
    `SELECT user_id, xp, level, status, sanity, deaths, money, is_sick, taxes_paid, insurance_paid,
      (
        xp
        + money * 2
        + status * 5
        + sanity * 3
        + CASE WHEN taxes_paid THEN 75 ELSE -75 END
        + CASE WHEN insurance_paid THEN 50 ELSE 0 END
        - CASE WHEN is_sick THEN 60 ELSE 0 END
      ) AS score
     FROM users
     WHERE guild_id = $1
     ORDER BY score DESC
     LIMIT 10`,
    [guildId]
  );
  return res.rows;
}

export async function moisturize(userId: string) {
  const res = await pool.query(
    `UPDATE users SET dryness = GREATEST(0, dryness - 20), updated_at = NOW() WHERE user_id = $1 RETURNING *`,
    [userId]
  );
  return res.rows[0];
}

export async function addMoney(userId: string, amount: number) {
  const res = await pool.query(
    `UPDATE users SET money = money + $1, updated_at = NOW() WHERE user_id = $2 RETURNING *`,
    [amount, userId]
  );
  return res.rows[0];
}

export async function setSick(userId: string, sick: boolean) {
  const res = await pool.query(
    `UPDATE users SET is_sick = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *`,
    [sick, userId]
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

export async function expireInsuranceAll(): Promise<void> {
  await pool.query(`
    UPDATE users
    SET insurance_paid = FALSE, insurance_paid_at = NULL, updated_at = NOW()
    WHERE insurance_paid = TRUE
      AND insurance_paid_at < NOW() - INTERVAL '5 days'
  `);
}

export async function decreaseDrynessAll(): Promise<void> {
  await pool.query(`
    UPDATE users SET dryness = LEAST(100, dryness + 1), updated_at = NOW() WHERE dryness < 100
  `);
}

export async function hungerGain(userId: string, amount : number) {
  const res = await pool.query(
    `UPDATE users SET hunger = LEAST(100, hunger + $1), updated_at = NOW() WHERE user_id = $2 RETURNING *`,
    [amount, userId]
  );
  return res.rows[0];
}

export async function hungerLoss(userId: string, amount: number) {
  const res = await pool.query(
    `UPDATE users SET hunger = GREATEST(0, hunger - $1), updated_at = NOW() WHERE user_id = $2 RETURNING *`,
    [amount, userId]
  );
  return res.rows[0];
}

export async function weightLoss(userId: string, amount : number) {
  const res = await pool.query(
    `UPDATE users SET weight = GREATEST(0, weight - $1), updated_at = NOW() WHERE user_id = $2 RETURNING *`,
    [amount, userId]
  );
  return res.rows[0];
}


export async function weightGain(userId: string, amount : number) {
  const res = await pool.query(
    `UPDATE users SET weight = LEAST(100, weight + $1), updated_at = NOW() WHERE user_id = $2 RETURNING *`,
    [amount, userId]
  );
  return res.rows[0];
}

export async function getAllUsers(guildId: string): Promise<{ user_id: string }[]> {
  const res = await pool.query('SELECT user_id FROM users WHERE guild_id = $1', [guildId]);
  return res.rows;
}

export async function killAllUsers(guildId: string): Promise<void> {
  await pool.query(`
    UPDATE users
    SET xp = 0, level = 1, status = 0, sanity = 100, deaths = deaths + 1,
        hunger = 100, weight = 50, dryness = 50, money = 0,
        is_sick = FALSE, insurance_paid = FALSE, insurance_paid_at = NULL,
        updated_at = NOW()
    WHERE guild_id = $1
  `, [guildId]);
}

export async function gainSanity(userId: string, amount: number) {
  const res = await pool.query(
    `UPDATE users SET sanity = LEAST(100, sanity + $1), updated_at = NOW() WHERE user_id = $2 RETURNING *`,
    [amount, userId]
  );
  return res.rows[0];
}

export async function payTaxes(userId: string) {
  const res = await pool.query(
    `UPDATE users SET taxes_paid = TRUE, updated_at = NOW() WHERE user_id = $1 RETURNING *`,
    [userId]
  );
  return res.rows[0];
}

export async function applyTaxPenalties(guildId: string): Promise<{ user_id: string; old_money: number; new_money: number }[]> {
  const before = await pool.query(
    `SELECT user_id, money FROM users WHERE guild_id = $1 AND taxes_paid = FALSE AND money > 0`,
    [guildId]
  );
  if (before.rows.length === 0) return [];
  await pool.query(
    `UPDATE users SET money = FLOOR(money * 0.75), updated_at = NOW()
     WHERE guild_id = $1 AND taxes_paid = FALSE AND money > 0`,
    [guildId]
  );
  return before.rows.map((row: { user_id: string; money: number }) => ({
    user_id: row.user_id,
    old_money: row.money,
    new_money: Math.floor(row.money * 0.75),
  }));
}

export async function resetTaxesAll(guildId: string): Promise<void> {
  await pool.query(
    `UPDATE users SET taxes_paid = FALSE, updated_at = NOW() WHERE guild_id = $1`,
    [guildId]
  );
}

// ── David's Secret Fund ──────────────────────────────────────────────────────

export async function getFund(): Promise<bigint> {
  const res = await pool.query(`SELECT total::text AS total FROM david_fund WHERE id = 1`);
  return BigInt(res.rows[0].total);
}

export async function addToFund(amount: number): Promise<bigint> {
  const res = await pool.query(
    `UPDATE david_fund SET total = total + $1 WHERE id = 1 RETURNING total::text AS total`,
    [amount]
  );
  return BigInt(res.rows[0].total);
}

export async function getTop3ByMoney(guildId: string): Promise<{ user_id: string; money: number }[]> {
  const res = await pool.query(
    `SELECT user_id, money FROM users WHERE guild_id = $1 AND money > 0 ORDER BY money DESC LIMIT 3`,
    [guildId]
  );
  return res.rows;
}