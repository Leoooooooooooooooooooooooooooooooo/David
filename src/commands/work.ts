import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, addMoney, setSick, hungerLoss } from '../db/index';

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 30_000;

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

  const earned = Math.floor(Math.random() * 96) + 25;
  const gotSick = Math.random() < 0.10; // 10% chance to get sick

  await addMoney(userId, earned);
  if (gotSick) await setSick(userId, true);

  const sickLine = gotSick ? `\n You just got Ebola lol` : '';
  await interaction.reply(`<:davidwork:1514871951808528405> **${interaction.user.displayName}** worked and earned **$${earned}**.${sickLine}`);
}
