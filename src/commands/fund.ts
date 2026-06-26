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

  // Compute percent with 20 decimal places of precision using BigInt arithmetic
  const DECIMALS = 20;
  const scale = BigInt(10) ** BigInt(DECIMALS + 2); // +2 for the "out of 100" conversion
  const percentBig = total * scale / QUINTILLION;
  const percentStr = percentBig.toString().padStart(DECIMALS + 3, '0');
  const intPart = percentStr.slice(0, -DECIMALS) || '0';
  const fracPart = percentStr.slice(-DECIMALS);
  const percentDisplay = `${intPart}.${fracPart.replace(/0+$/, '') || '0'}`;

  const progressFilled = Math.min(20, Math.floor(Number(total * BigInt(20) / QUINTILLION)));
  const progressBar = '█'.repeat(progressFilled) + '░'.repeat(20 - progressFilled);

  const embed = new EmbedBuilder()
    .setTitle("<:davidmoney:1514872079491530852> David's Secret Fund")
    .setDescription(
      `**Current Total:** $${total.toLocaleString()}\n\n` +
      `**Progress to Quintillion:**\n` +
      `\`[${progressBar}]\` ${percentDisplay}%\n\n` +
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
