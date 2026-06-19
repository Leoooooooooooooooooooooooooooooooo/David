import { Client, TextChannel } from 'discord.js';
import { getAllUsers, killAllUsers } from './db/index';
import { getWords } from './words';

const MAX_GUESSES_PER_USER = 3;
const WRONG_GUESS_SANITY_COST = 10;

interface EvilEventState {
  active: boolean;
  word: string;
  guildId: string;
  channelId: string;
  killedByTimeout: NodeJS.Timeout | null;
  userGuesses: Map<string, number>;
}

const state: EvilEventState = {
  active: false,
  word: '',
  guildId: '',
  channelId: '',
  killedByTimeout: null,
  userGuesses: new Map(),
};

let discordClient: Client | null = null;
let pendingEventTimeout: NodeJS.Timeout | null = null;

export function initEvilEvent(client: Client): void {
  discordClient = client;
  scheduleNextEvent(false);
}

export function isEventActive(): boolean {
  return state.active;
}

// ms until a random time between 6–10:59 PM ET
// alwaysTomorrow: true after an event fires so we never double-fire in the same window
function msUntilNextEvent(alwaysTomorrow: boolean): number {
  const now = new Date();
  const etParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(now);

  const etHour = parseInt(etParts.find(p => p.type === 'hour')!.value);
  const etMinute = parseInt(etParts.find(p => p.type === 'minute')!.value);
  const etSecond = parseInt(etParts.find(p => p.type === 'second')!.value);

  const targetHour = Math.floor(Math.random() * 5) + 18; // 18–22 inclusive
  const targetMinute = Math.floor(Math.random() * 60);

  const currentSecs = etHour * 3600 + etMinute * 60 + etSecond;
  let targetSecs = targetHour * 3600 + targetMinute * 60;

  if (alwaysTomorrow || targetSecs <= currentSecs) {
    targetSecs += 24 * 3600;
  }

  return (targetSecs - currentSecs) * 1000;
}

function scheduleNextEvent(alwaysTomorrow: boolean): void {
  if (pendingEventTimeout) {
    clearTimeout(pendingEventTimeout);
    pendingEventTimeout = null;
  }
  const ms = msUntilNextEvent(alwaysTomorrow);
  const hours = (ms / 3_600_000).toFixed(1);
  console.log(`[EvilEvent] Next evil event in ${hours} hours`);
  pendingEventTimeout = setTimeout(startEvilEvent, ms);
}

export async function triggerEvilEventNow(): Promise<void> {
  if (state.active) return;
  // Only allow manual trigger within the normal 6–10:59 PM ET window
  const etParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const etHour = parseInt(etParts.find(p => p.type === 'hour')!.value);
  if (etHour < 18 || etHour >= 23) return;
  await startEvilEvent();
}

async function startEvilEvent(): Promise<void> {
  pendingEventTimeout = null;
  if (state.active) return;
  if (!discordClient) return;

  const words = getWords();
  if (words.length === 0) {
    console.error('[EvilEvent] No words available — skipping event');
    scheduleNextEvent(true);
    return;
  }

  const guildId = process.env.GUILD_ID!;
  const channelId = process.env.CHANNEL_ID!;

  const guild = discordClient.guilds.cache.get(guildId);
  if (!guild) {
    console.error('[EvilEvent] Guild not found');
    scheduleNextEvent(true);
    return;
  }

  const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel?.send) {
    console.error('[EvilEvent] Channel not found or not sendable');
    scheduleNextEvent(true);
    return;
  }

  const word = words[Math.floor(Math.random() * words.length)];
  state.active = true;
  state.word = word;
  state.guildId = guildId;
  state.channelId = channelId;
  state.userGuesses = new Map();

  const users = await getAllUsers(guildId);
  const mentions = users.map((u: { user_id: string }) => `<@${u.user_id}>`).join(' ');

  await channel.send(
    `<:davidanger:1514871838360993804> **Hey guys im actually evil now btw**\n\n` +
    (mentions ? `${mentions}\n\n` : '') +
    `I have chosen an evil **5-letter password**. Guess it or im gonna kill you all.\n` +
    `Use \`/guess <word>\` — it works like Wordle:\n` +
    `🟩 right letter, right spot  |  🟨 right letter, wrong spot  |  ⬛ not in my evil password\n\n` +
    `⚠️ Each person only gets **${MAX_GUESSES_PER_USER} guesses**. Wrong guesses cost **${WRONG_GUESS_SANITY_COST} sanity**. Choose wisely.\n` +
    `⏰ You have **15 minutes**. Fail... and **EVERYONE DIES.**`
  );

  state.killedByTimeout = setTimeout(everyoneDies, 15 * 60 * 1000);

  // Schedule the next event for tomorrow's window
  scheduleNextEvent(true);
}

async function everyoneDies(): Promise<void> {
  if (!state.active) return;

  const word = state.word;
  const guildId = state.guildId;
  const channelId = state.channelId;

  state.active = false;
  state.word = '';
  state.killedByTimeout = null;

  if (!discordClient) return;

  const guild = discordClient.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(channelId) as TextChannel | undefined;

  const users = await getAllUsers(guildId);
  await killAllUsers(guildId);

  const deathList = users.map((u: { user_id: string }) => `💀 <@${u.user_id}>`).join('\n');

  await channel?.send(
    `💀 **TIME'S UP.** Nobody cracked my evil password.\n\n` +
    `The word was **${word.toUpperCase()}**.\n\n` +
    `**EVERYONE DIES:**\n` +
    (deathList || 'nobody was even in the database lol')
  );
}

function getWordleHint(secret: string, guess: string): string {
  const s = secret.toUpperCase().split('');
  const g = guess.toUpperCase().split('');
  const result = Array(5).fill('⬛');
  const usedSecret = Array(5).fill(false);
  const usedGuess = Array(5).fill(false);

  for (let i = 0; i < 5; i++) {
    if (g[i] === s[i]) {
      result[i] = '🟩';
      usedSecret[i] = true;
      usedGuess[i] = true;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (usedGuess[i]) continue;
    for (let j = 0; j < 5; j++) {
      if (usedSecret[j]) continue;
      if (g[i] === s[j]) {
        result[i] = '🟨';
        usedSecret[j] = true;
        break;
      }
    }
  }

  return result.join('');
}

export interface GuessResult {
  hint: string;
  isCorrect: boolean;
  secretWord?: string;
  outOfGuesses?: boolean;
  guessesUsed?: number;
  guessesRemaining?: number;
}

export function processGuess(guess: string, userId: string): GuessResult | null {
  if (!state.active) return null;

  const used = state.userGuesses.get(userId) ?? 0;
  if (used >= MAX_GUESSES_PER_USER) {
    return { hint: '', isCorrect: false, outOfGuesses: true, guessesUsed: used, guessesRemaining: 0 };
  }

  const normalized = guess.toUpperCase().trim();
  const hint = getWordleHint(state.word, normalized);
  const isCorrect = normalized === state.word.toUpperCase();

  if (isCorrect) {
    if (state.killedByTimeout) {
      clearTimeout(state.killedByTimeout);
      state.killedByTimeout = null;
    }
    const secretWord = state.word;
    state.active = false;
    state.word = '';
    return { hint, isCorrect: true, secretWord };
  }

  const newUsed = used + 1;
  state.userGuesses.set(userId, newUsed);
  return {
    hint,
    isCorrect: false,
    guessesUsed: newUsed,
    guessesRemaining: MAX_GUESSES_PER_USER - newUsed,
  };
}

export { WRONG_GUESS_SANITY_COST };
