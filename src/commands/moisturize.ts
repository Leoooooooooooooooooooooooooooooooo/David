import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, moisturize } from '../db/index';

export const data = new SlashCommandBuilder()
  .setName('moisturize')
  .setDescription('Apply moisture. You need it.');

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;

  await getOrCreateUser(userId, guildId);
  const updated = await moisturize(userId);

  await interaction.reply(
    `<:davidmoisturize:1514871879381291038> **${interaction.user.displayName}** moisturized. Dryness is now **${updated.dryness}%**.`
  );
}