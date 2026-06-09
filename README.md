# Discord Bot

## Setup

### 1. Configure environment
```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DISCORD_TOKEN` — your bot token from the Discord Developer Portal
- `CLIENT_ID` — your bot's Application ID (Developer Portal → General Information)
- `GUILD_ID` — already set to your server
- `DB_PASSWORD` — change this to something secure

### 2. Deploy slash commands
You need to do this once (or whenever you add new commands).

```bash
npm install
npm run deploy-commands
```

### 3. Run with Docker (on your NAS)
```bash
docker compose up -d
```

To view logs:
```bash
docker compose logs -f bot
```

To stop:
```bash
docker compose down
```

---

## Features

| Feature | How it works |
|---|---|
| XP | +5 XP per message (10s cooldown), +2 XP per minute in VC |
| Level | Every 100 XP = level up, announced in channel |
| Status | +3 per time you get pinged by someone |
| Sanity | -10 per GIF sent, resets to 100 on death |
| Death | Sanity hits 0 → all stats reset, death counter increments |

## Commands

| Command | Description |
|---|---|
| `/stats [@user]` | Show your stats (or someone else's) |
| `/leaderboard` | Top 10 by XP |

---

## Where data lives
PostgreSQL data is stored in a Docker volume (`pgdata`). On your NAS, this persists between restarts and container rebuilds.
