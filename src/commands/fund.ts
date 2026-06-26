import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getFund, addToFund, getOrCreateUser, spendMoney } from '../db/index';

export const data = new SlashCommandBuilder()
  .setName('fund')
  .setDescription("Check the status of David's Secret Fund")
  .addSubcommand(sub =>
    sub.setName('status')
      .setDescription("View the current status of David's Secret Fund")
  )
  .addSubcommand(sub =>
    sub.setName('donate')
      .setDescription("Contribute your own money to David's Secret Fund")
      .addIntegerOption(opt =>
        opt.setName('amount')
          .setDescription('Amount to donate')
          .setRequired(true)
          .setMinValue(1)
      )
  );

const QUINTILLION = BigInt('1000000000000000000');

async function showStatus(interaction: ChatInputCommandInteraction) {
  const total = await getFund();
  const percent = Number((total * BigInt(10000) / QUINTILLION)) / 100;

  const progressFilled = Math.floor(percent / 5);
  const progressBar = '█'.repeat(progressFilled) + '░'.repeat(20 - progressFilled);

  const embed = new EmbedBuilder()
    .setTitle("<:davidmoney:1514872079491530852> David's Secret Fund")
    .setDescription(
      `**Current Total:** $${total.toLocaleString()}\n\n` +
      `**Progress to Quintillion:**\n` +
      `\`[${progressBar}]\` ${percent.toFixed(20)}%\n\n` +
      `*The top 3 richest players are taxed weekly: #1 pays 66%, #2 pays 50%, #3 pays 33%.\n` +
      `Failure to pay kills you lol*`
    )
    .setColor(0xffd700)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function donate(interaction: ChatInputCommandInteraction) {
  const amount = interaction.options.getInteger('amount', true);
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;

  const user = await getOrCreateUser(userId, guildId);
  if (user.money < amount) {
    await interaction.reply({ content: `You only have $${user.money.toLocaleString()} — you can't donate $${amount.toLocaleString()}.`, ephemeral: true });
    return;
  }

  await spendMoney(userId, amount);
  const newTotal = await addToFund(amount);

  const embed = new EmbedBuilder()
    .setTitle("<:davidmoney:1514872079491530852> Donation Received!")
    .setDescription(
      `${interaction.user} donated **$${amount.toLocaleString()}** to David's Secret Fund!\n\n` +
      `**New Fund Total:** $${newTotal.toLocaleString()}`
    )
    .setColor(0xffd700)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'donate') {
    await donate(interaction);
  } else {
    await showStatus(interaction);
  }
}
