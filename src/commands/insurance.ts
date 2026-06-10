import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, spendMoney, payInsurance } from '../db/index';

export const data = new SlashCommandBuilder()
  .setName('insurance')
  .setDescription('Pay your insurance premiums');

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;

  const user = await getOrCreateUser(userId, guildId);

  // Base cost $50, +$25 per death
  const cost = 50 + (user.deaths * 25);

  if (user.money < cost) {
    await interaction.reply(
      `📋 Your insurance premium is **$${cost}** but you only have **$${user.money}**. Get a J*b Fatty`
    );
    return;
  }

  await spendMoney(userId, cost);
  await payInsurance(userId);

  const paidAt = new Date().toLocaleDateString('en-CA');
  const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');

  await interaction.reply(
    `📋 **${interaction.user.displayName}** paid their insurance premium of **$${cost}**.\n` +
    `✅ Insurance is paid bro | Paid: **${paidAt}** | Expires: **${expiresAt}** | Deaths on record: **${user.deaths}**`
  );
}