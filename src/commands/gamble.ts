import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, addMoney,loseSanity} from '../db/index';



export const data = new SlashCommandBuilder()
  .setName('gamble')
  .setDescription('Gamble your lifes savings away');

export async function execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId!;

  const user = await getOrCreateUser(userId, guildId);

  if (user.money <= 0) {
    await interaction.reply(`🎰 **${interaction.user.displayName}** is broke. Nothing to gamble.`);
    return;
  }

  const sanityResult = await loseSanity(userId, guildId, 5);
  if (sanityResult.died) {
    await interaction.reply(`<:daviddeath:1513943034738245794> **${interaction.user.displayName}** lost their mind gambling and DIED. All their money is GONE.`);
    return;
  }

  const currentMoney = user.money;
  const jackpotRoll = Math.floor(Math.random() * 1000) + 1;
  let earned = 0;
  let isJackpot = false;
  if (jackpotRoll === 1) {
    earned = user.money + 1000;
    isJackpot = true;
  } else {
    earned = Math.floor(Math.random() * ((user.money * 2.5) + 1));
  }
  const netChange = earned - user.money;

  await addMoney(userId, netChange);
  if (isJackpot) {
    await interaction.reply(`🎉 YOU HIT THE JACKPOT! **${interaction.user.displayName}** had **$${currentMoney}**, gambled and now has $1000 more! your so rich! with a total of **$${earned}**`);
  } else {
    await interaction.reply(`<:davidgamble:1514871859206815804> **${interaction.user.displayName}** had **$${currentMoney}**, gambled and now has **$${earned}**, and **${sanityResult.sanity}** sanity`);
  }

}