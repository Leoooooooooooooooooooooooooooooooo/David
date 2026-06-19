import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, payTaxes } from '../db/index';

export const data = new SlashCommandBuilder()
  .setName('taxes')
  .setDescription('File your monthly taxes. Fail to file by end of month and lose 25% of your money.');

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;

  const user = await getOrCreateUser(userId, guildId);

  if (user.taxes_paid) {
    await interaction.reply({
      content: `✅ **${interaction.user.displayName}** already filed their taxes this month good j*b`,
      ephemeral: true,
    });
    return;
  }

  await payTaxes(userId);

  await interaction.reply(
    `📋 **${interaction.user.displayName}** filed their taxes. David is pleased`
  );
}
