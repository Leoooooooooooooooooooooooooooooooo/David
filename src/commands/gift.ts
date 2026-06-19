import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, spendMoney, addMoney } from '../db/index';

export const data = new SlashCommandBuilder()
  .setName('gift')
  .setDescription('Gift money to another user. 50% chance you accidentally give them everything you have.')
  .addUserOption(option =>
    option.setName('user').setDescription('Who to gift money to').setRequired(true)
  )
  .addIntegerOption(option =>
    option.setName('amount').setDescription('How much to gift').setRequired(true).setMinValue(1)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;
  const recipient = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);

  if (recipient.id === userId) {
    await interaction.reply({ content: 'You cannot gift money to yourself.', ephemeral: true });
    return;
  }
  if (recipient.bot) {
    await interaction.reply({ content: 'You cannot gift money to a bot.', ephemeral: true });
    return;
  }

  const user = await getOrCreateUser(userId, guildId);

  if (user.money <= 0) {
    await interaction.reply({ content: `💸 You have no money to give. Broke.`, ephemeral: true });
    return;
  }

  if (user.money < amount) {
    await interaction.reply({ content: `💸 You only have **$${user.money}**. You can't gift **$${amount}**.`, ephemeral: true });
    return;
  }

  await getOrCreateUser(recipient.id, guildId);

  if (Math.random() < 0.5) {
    const all = user.money;
    await spendMoney(userId, all);
    await addMoney(recipient.id, all);
    await interaction.reply(
      `💸 **${interaction.user.displayName}** tried to gift **$${amount}** to **${recipient.displayName}** but fumbled it completely and accidentally handed over ALL **$${all}** of their money. Oops.`
    );
  } else {
    await spendMoney(userId, amount);
    await addMoney(recipient.id, amount);
    await interaction.reply(
      `🎁 **${interaction.user.displayName}** gifted **$${amount}** to **${recipient.displayName}**. How generous.`
    );
  }
}
