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
    await interaction.reply({ content: `<:davidsick:1514872041822617630> You're not even sick lol.`, ephemeral: true });
    return;
  }

  const updated = await loseSanity(userId, guildId, 50);

  if (updated.died) {
    await interaction.reply(`<:daviddeath:1513943034738245794> **${interaction.user.displayName}** only had **${user.sanity} sanity** — recovering costs 50. Their sanity hit 0 and they DIED. Maybe check \`/stats\` before recovering next time lol`);
    return;
  }

  await setSick(userId, false);
  await interaction.reply(`<:davidrecover:1514872024596611122> **${interaction.user.displayName}** spent 50 sanity and recovered... the noises... (**${updated.sanity} sanity** remaining)`);
}
