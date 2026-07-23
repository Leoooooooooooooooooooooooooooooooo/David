import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, killUser, spendMoney } from '../db/index';

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 10 * 60 * 1000;
const MIN_COST = 10;
const BASE_SUCCESS = 0.25;
const MAX_SUCCESS = 0.65;
const BACKFIRE_CHANCE = 0.25;
const BOUNTY_THRESHOLD = 1000;

function successChance(targetMoney: number): number {
  if (targetMoney <= BOUNTY_THRESHOLD) return BASE_SUCCESS;
  const doublings = Math.log2(targetMoney / BOUNTY_THRESHOLD);
  return Math.min(MAX_SUCCESS, BASE_SUCCESS + doublings * 0.05);
}

export const data = new SlashCommandBuilder()
  .setName('assassinate')
  .setDescription('Hire a hitman to eliminate someone. The richer the target, the better the odds.')
  .addUserOption(option =>
    option.setName('target').setDescription('Your target').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;
  const target = interaction.options.getUser('target', true);

  if (target.id === userId) {
    await interaction.reply({ content: 'You cannot assassinate yourself. Seek help.', ephemeral: true });
    return;
  }
  if (target.bot) {
    await interaction.reply({ content: 'You cannot assassinate a bot.', ephemeral: true });
    return;
  }

  const lastUsed = cooldowns.get(userId) ?? 0;
  const remaining = COOLDOWN_MS - (Date.now() - lastUsed);
  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60_000);
    await interaction.reply({ content: `⏳ Lay low for **${mins} more minute(s)** before attempting another hit.`, ephemeral: true });
    return;
  }

  const user = await getOrCreateUser(userId, guildId);
  const targetUser = await getOrCreateUser(target.id, guildId);

  const cost = Math.max(MIN_COST, Math.floor(Math.min(user.money, targetUser.money) * 0.5));

  if (user.money < cost) {
    await interaction.reply({
      content: `🔫 Hiring a hitman on **${target.displayName}** costs **$${cost}**. You only have **$${user.money}**`,
      ephemeral: true,
    });
    return;
  }

  await spendMoney(userId, cost);
  cooldowns.set(userId, Date.now());

  const chance = successChance(targetUser.money);
  const pct = Math.round(chance * 100);
  const roll = Math.random();

  if (roll < chance) {
    await killUser(target.id);
    await interaction.reply(
      `<:daviddeath:1513943034738245794> **${interaction.user.displayName}** paid **$${cost}** and successfully had **${target.displayName}** eliminated. Damn.\nTheir **$${targetUser.money.toLocaleString()}** fortune made it a **${pct}%** shot. Being rich has consequences.`
    );
  } else if (roll < chance + BACKFIRE_CHANCE) {
    await killUser(userId);
    await interaction.reply(
      `<:daviddeath:1513943034738245794> **${interaction.user.displayName}** tried to assassinate **${target.displayName}**... and got double-crossed by their own hitman. Paid $${cost} to die lol`
    );
  } else {
    await interaction.reply(
      `🔫 **${interaction.user.displayName}** paid **$${cost}** to have **${target.displayName}** killed... and the hitman biffed it lol (odds were ${pct}%)`
    );
  }
}
