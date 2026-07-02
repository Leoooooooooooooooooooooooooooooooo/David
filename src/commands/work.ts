import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, addMoney, setSick, promoteUser } from '../db/index';

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 30_000;

function getTitle(promotionLevel: number): string {
  if (promotionLevel === 0) return 'Employee';
  return `Employee ${'+'.repeat(promotionLevel)}`;
}

export const data = new SlashCommandBuilder()
  .setName('work')
  .setDescription('Get a J*b.');

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;

  const user = await getOrCreateUser(userId, guildId);

  if (user.is_sick) {
    await interaction.reply({ content: `🤧 **${interaction.user.displayName}** is too sick to work lol`, ephemeral: true });
    return;
  }

  const lastUsed = cooldowns.get(userId) ?? 0;
  const remaining = COOLDOWN_MS - (Date.now() - lastUsed);
  if (remaining > 0) {
    await interaction.reply({ content: `⏳ You just worked. Wait **${Math.ceil(remaining / 1000)}s** before working again.`, ephemeral: true });
    return;
  }

  cooldowns.set(userId, Date.now());

  const promotionLevel = user.promotion_level ?? 0;
  const multiplier = Math.pow(2, promotionLevel);
  const base = Math.floor(Math.random() * 96) + 25;
  const earned = Math.floor(base * multiplier);

  const gotSick = Math.random() < 0.10;
  const gotPromoted = Math.random() < 0.10;

  await addMoney(userId, earned);
  if (gotSick) await setSick(userId, true);

  let newPromoLevel = promotionLevel;
  if (gotPromoted) {
    const updated = await promoteUser(userId);
    newPromoLevel = updated.promotion_level;
  }

  const title = getTitle(promotionLevel);
  const newTitle = getTitle(newPromoLevel);

  const sickLine = gotSick ? `\nYou just got Ebola lol` : '';
  const promotionLine = gotPromoted
    ? `\n<:davidwork:1514871951808528405> **PROMOTED!** You are now **${newTitle}**!`
    : '';

  await interaction.reply(
    `<:davidwork:1514871951808528405> **${interaction.user.displayName}** (${title}) worked and earned **$${earned.toLocaleString()}**.${sickLine}${promotionLine}`
  );
}
