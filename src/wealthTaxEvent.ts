import { Client, TextChannel } from 'discord.js';
import { getTop3ByMoney, spendMoney, addToFund, killUser, getFund } from './db/index';

// Rates for rank 1, 2, 3
const TAX_RATES = [0.66, 0.50, 0.33];
const QUINTILLION = BigInt('1000000000000000000');

let discordClient: Client | null = null;
let lastTaxWeek: number = -1;

function currentWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

export function initWealthTaxEvent(client: Client): void {
  discordClient = client;
  lastTaxWeek = currentWeekNumber();
  setInterval(checkWeeklyWealthTax, 60 * 60 * 1000);
}

export async function triggerWealthTaxNow(): Promise<void> {
  await checkWeeklyWealthTax();
}

async function checkWeeklyWealthTax(): Promise<void> {
  const week = currentWeekNumber();
  if (week === lastTaxWeek) return;
  lastTaxWeek = week;

  const guildId = process.env.GUILD_ID!;
  const channelId = process.env.CHANNEL_ID!;

  const top3 = await getTop3ByMoney(guildId);
  if (top3.length === 0) return;

  if (!discordClient) return;
  const guild = discordClient.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel?.send) return;

  const results: string[] = [];
  let totalCollected = 0;

  for (let i = 0; i < top3.length; i++) {
    const { user_id, money } = top3[i];
    const rate = TAX_RATES[i];
    const rank = i + 1;
    const owed = Math.floor(money * rate);

    if (money < owed || money === 0) {
      // Can't pay — die
      await killUser(user_id);
      results.push(
        `<:daviddeath:1513943034738245794> **#${rank}** <@${user_id}> couldn't pay their **${Math.round(rate * 100)}% wealth tax** ($${owed} owed on $${money}). They have been **executed.**`
      );
    } else {
      await spendMoney(user_id, owed);
      totalCollected += owed;
      results.push(
        `<:davidmoney:1514872079491530852> **#${rank}** <@${user_id}> paid **$${owed}** (${Math.round(rate * 100)}% of $${money}) into David's Secret Fund.`
      );
    }
  }

  const newTotal = await addToFund(totalCollected);

  await channel.send(
    `⚠️ **WEEKLY WEALTH TAX — DAVID COLLECTS HIS TITHE** ⚠️\n\n` +
    results.join('\n') +
    `\n\n<:davidmoney:1514872079491530852> **David's Secret Fund now holds: $${newTotal.toLocaleString()}**`
  );

  if (newTotal >= QUINTILLION) {
    await channel.send(
      `@everyone\n\n` +
      `🚨🚨🚨 **IT HAS HAPPENED.** 🚨🚨🚨\n\n` +
      `David's Secret Fund has reached **$1,000,000,000,000,000,000** — ONE QUINTILLION DOLLARS.\n\n` +
      `David is now the wealthiest entity in the known universe`
    );
  }
}
