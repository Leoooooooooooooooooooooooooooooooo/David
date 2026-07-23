import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, addMoney, setSick, promoteUser, demoteUser, killUser, setUnemployed, loseSanity } from '../db/index';

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 30_000;
const MAX_PROMOTION_LEVEL = 5;
const DEMOTION_CHANCE = 0.50;
const GET_JOB_CHANCE = 0.25;

function getTitle(promotionLevel: number): string {
  if (promotionLevel === 0) return 'Employee';
  return `Employee ${'+'.repeat(promotionLevel)}`;
}

export const data = new SlashCommandBuilder()
  .setName('work')
  .setDescription('Get a J*b.');

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;

  const user = await getOrCreateUser(userId, guildId);

  if (user.is_sick) {
    await interaction.reply({ content: `<:davidsick:1514872041822617630> **${interaction.user.displayName}** is too sick to work lol`, ephemeral: true });
    return;
  }

  const lastUsed = cooldowns.get(userId) ?? 0;
  const remaining = COOLDOWN_MS - (Date.now() - lastUsed);
  if (remaining > 0) {
    if (!user.unemployed) {
      await interaction.reply({ content: `⏳ You just worked. Wait **${Math.ceil(remaining / 1000)}s** before working again.`, ephemeral: true });
    }
    else {
      await interaction.reply({ content: `⏳ You just tried applying. Wait **${Math.ceil(remaining / 1000)}s** before working again.`, ephemeral: true });
    }
    return;
  }

  cooldowns.set(userId, Date.now());

  if (user.unemployed) {
    if (Math.random() < GET_JOB_CHANCE) {
      await setUnemployed(userId, false);
      await interaction.reply(`<:davidwork:1514871951808528405> **${interaction.user.displayName}** did it!! Nice job getting a job!! Your title is now **JOBBER**!!.`);
    } else {
      const sanityResult = await loseSanity(userId, guildId, 10);
      await interaction.reply(`<:davidwork:1514871951808528405> **${interaction.user.displayName}** applied for 30 different jobs and got rejected from all of them! Wow! Living is great!!! **${sanityResult.sanity} sanity left.**`);
      return;
    }
  }

  const promotionLevel = user.promotion_level ?? 0;
  const multiplier = Math.pow(2, promotionLevel);
  const base = Math.floor(Math.random() * 96) + 25;
  const earned = Math.floor(base * multiplier);

  const gotSick = Math.random() < 0.10;
  const gotPromoted = promotionLevel < MAX_PROMOTION_LEVEL && Math.random() < 0.10 / (promotionLevel + 1);
  const gotDemoted = !gotPromoted && Math.random() < DEMOTION_CHANCE;
  const gotFired = gotDemoted && promotionLevel === 0;

  if (gotFired) {
    await setUnemployed(userId, true);
    await interaction.reply(
      `<:davidwork:1514871951808528405> **${interaction.user.displayName}** (${getTitle(promotionLevel)}) worked and earned **$${earned.toLocaleString()}**.\n` +
      `<:davidtemphot:1513942996641644846> **FIRED!** looks like you gotta look for a job... FUCK. EVERYTHING. `
    );
    return;
  }

  await addMoney(userId, earned);
  if (gotSick) await setSick(userId, true);

  let newPromoLevel = promotionLevel;
  if (gotPromoted) {
    const updated = await promoteUser(userId);
    newPromoLevel = updated.promotion_level;
  } else if (gotDemoted) {
    const updated = await demoteUser(userId);
    newPromoLevel = updated.promotion_level;
  }

  const title = getTitle(promotionLevel);
  const newTitle = getTitle(newPromoLevel);

  const sickLine = gotSick ? `\nYou just got Ebola lol` : '';
  const promotionLine = gotPromoted
    ? `\n<:davidwork:1514871951808528405> **PROMOTED!** You are now **${newTitle}**!`
    : gotDemoted
    ? `\n📉 **DEMOTED!** You are now **${newTitle}**, you fat chud!`
    : '';

  await interaction.reply(
    `<:davidwork:1514871951808528405> **${interaction.user.displayName}** (${title}) worked and earned **$${earned.toLocaleString()}**.${sickLine}${promotionLine}`
  );
}
