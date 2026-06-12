import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, loseSanity, setSick } from '../db/index';

export const data = new SlashCommandBuilder()
  .setName('recover')
  .setDescription('Recover from sickness. Costs 50 sanity.');

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;

  const user = await getOrCreateUser(userId, guildId);

  if (!user.is_sick) {
    await interaction.reply({ content: `🤧 You're not even sick lol.`, ephemeral: true });
    return;
  }

  const updated = await loseSanity(userId, guildId, 50);

  if (updated.died) {
    await interaction.reply(`<:daviddeath:1513943034738245794> **${interaction.user.displayName}** tried to recover but lost their mind entirely and died lol.`);
    return;
  }

  await setSick(userId, false);
  await interaction.reply(`<:davidrecover:1514872024596611122> **${interaction.user.displayName}** spent 50 sanity and recovered... the noises...`);
}
