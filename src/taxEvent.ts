import { Client, TextChannel } from 'discord.js';
import { applyTaxPenalties, resetTaxesAll } from './db/index';

let discordClient: Client | null = null;
let lastPenaltyMonth: number = -1;

function currentETMonth(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());
  return parseInt(parts.find(p => p.type === 'month')!.value);
}

function currentETDay(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    day: 'numeric',
  }).formatToParts(new Date());
  return parseInt(parts.find(p => p.type === 'day')!.value);
}

export function initTaxEvent(client: Client): void {
  discordClient = client;
  // Initialize to the current month so we don't fire on startup
  lastPenaltyMonth = currentETMonth();
  setInterval(checkMonthlyTaxes, 60 * 60 * 1000);
}

async function checkMonthlyTaxes(): Promise<void> {
  const month = currentETMonth();
  const day = currentETDay();

  if (day !== 1 || month === lastPenaltyMonth) return;

  lastPenaltyMonth = month;

  const guildId = process.env.GUILD_ID!;
  const channelId = process.env.CHANNEL_ID!;

  console.log('[Taxes] Applying monthly tax penalties...');

  const penalized = await applyTaxPenalties(guildId);
  await resetTaxesAll(guildId);

  if (!discordClient) return;

  const guild = discordClient.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel?.send) return;

  if (penalized.length === 0) {
    await channel.send(
      `**TAX SEASON IS OVER.** Everyone filed their taxes this month lol`
    );
    return;
  }

  const mentions = penalized.map(u => `<@${u.user_id}>`).join(' ');
  const lines = penalized
    .map(u => `💸 <@${u.user_id}>: **$${u.old_money}** → **$${u.new_money}** (-$${u.old_money - u.new_money})`)
    .join('\n');

  // Humiliation message first, pinging all offenders
  await channel.send(
    `🚨 ${mentions}\n\n` +
    `ATTENTION EVERYONE. THE ABOVE INDIVIDUALS ARE **TAX EVADERS.** ` +
    `They had an entire month to type \`/taxes\` and couldn't even do that lmao. ` +
    `Laugh at these users`
  );

  // Follow up with the financial damage
  await channel.send(
    `📋 **DAVID HAS SPOKEN.**\n\n` +
    `The following CHUDS have been penalized **25%** of their money:\n\n` +
    lines +
    `\n\n*Next month, just type \`/taxes\`.*`
  );
}
