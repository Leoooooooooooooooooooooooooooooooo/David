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

  if (user.sanity < 50) {
    await interaction.reply({ content: `🧠 You need at least **50 sanity** to recover but you only have **${user.sanity}**. Suffer.`, ephemeral: true });
    return;
  }

  await loseSanity(userId, guildId, 50);
  await setSick(userId, false);

  await interaction.reply(`💊 **${interaction.user.displayName}** spent 50 sanity and recovered... the noises...`);
}
