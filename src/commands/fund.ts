import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getFund } from '../db/index';

export const data = new SlashCommandBuilder()
  .setName('fund')
  .setDescription("Check the status of David's Secret Fund");

const QUINTILLION = BigInt('1000000000000000000');

export async function execute(interaction: ChatInputCommandInteraction) {
  const total = await getFund();
  const percent = Number((total * BigInt(10000) / QUINTILLION)) / 100;

  const progressFilled = Math.floor(percent / 5);
  const progressBar = '█'.repeat(progressFilled) + '░'.repeat(20 - progressFilled);

  const embed = new EmbedBuilder()
    .setTitle("<:davidmoney:1514872079491530852> David's Secret Fund")
    .setDescription(
      `**Current Total:** $${total.toLocaleString()}\n\n` +
      `**Progress to Quintillion:**\n` +
      `\`[${progressBar}]\` ${percent.toFixed(4)}%\n\n` +
      `*The top 3 richest players are taxed weekly: #1 pays 66%, #2 pays 50%, #3 pays 33%.\n` +
      `Failure to pay kills you lol*`
    )
    .setColor(0xffd700)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
