import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, addMoney, loseSanity, updateGambleStreak } from '../db/index';

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

  const currentMoney = user.money as number;
  const jackpotRoll = Math.floor(Math.random() * 1000) + 1;
  let earned = 0;
  let isJackpot = false;

  if (jackpotRoll === 1) {
    earned = currentMoney * 1000;
    isJackpot = true;
  } else {
    earned = Math.floor(Math.random() * ((currentMoney * 2.5) + 1));
  }

  const netChange = earned - currentMoney;
  const won = netChange > 0;
  const [updated] = await Promise.all([
    updateGambleStreak(userId, won),
    addMoney(userId, netChange),
  ]);

  const streak = updated.gamble_streak as number;
  let streakBonus = 0;

  if (won && streak >= 3) {
    streakBonus = Math.floor(netChange * 0.5);
    await addMoney(userId, streakBonus);
  }

  if (isJackpot) {
    await interaction.reply(`🎉 YOU HIT THE JACKPOT! **${interaction.user.displayName}** had **$${currentMoney.toLocaleString()}** and now has a total of **$${earned.toLocaleString()}**`);
    return;
  }

  let warnLine = '';
  if (sanityResult.sanity <= 20) {
    warnLine = `\n **${sanityResult.sanity} sanity left** — each gamble costs 5. At 0 you DIE.`;
  }

  let streakLine = '';
  if (won && streak >= 3) {
    streakLine = `\n<:davidtemphot:1513942996641644846> **HOT STREAK x${streak}!** Bonus **$${streakBonus.toLocaleString()}** added on top!`;
  } else if (!won && streak <= -3) {
    streakLine = `\n<:davidtempcold:1513943014798524606> **yikes... you fucking suck ass at gambling...**  you lost ${Math.abs(streak)} in a row...`;
  }

  await interaction.reply(
    `<:davidgamble:1514871859206815804> **${interaction.user.displayName}** had **$${currentMoney.toLocaleString()}**, gambled and now has **$${(earned + streakBonus).toLocaleString()}**, and **${sanityResult.sanity}** sanity${warnLine}${streakLine}`
  );
}
