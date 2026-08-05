import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, addMoney, setSick, promoteUser, demoteUser, killUser, setUnemployed, loseSanity, rebirthUser } from '../db/index';

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 30_000;
const MAX_PROMOTION_LEVEL = 70;
const DEMOTION_CHANCE = 0.05;
const GET_JOB_CHANCE = 0.25;

function getTitle(promotionLevel: number, rebirths = 0): string {
  const stars = '*'.repeat(rebirths);
  if (promotionLevel === 0) return `Employee${stars}`;
  return `Employee ${'+'.repeat(promotionLevel)}${stars}`;
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
    }
    else {
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
    await addMoney(userId, earned);
    if (interaction.replied) {
      await interaction.followUp(`You literally are so buns you got fired after getting hired in one second bro...`);
    } else {
      await interaction.reply(
        `<:davidwork:1514871951808528405> **${interaction.user.displayName}** (${getTitle(promotionLevel)}) worked and earned **$${earned.toLocaleString()}**.\n` +
        `<:davidtemphot:1513942996641644846> **FIRED!** looks like you gotta look for a job... FUCK. EVERYTHING. `
      );
    }
    return;
  }

  await addMoney(userId, earned);
  if (gotSick) await setSick(userId, true);

  let newPromoLevel = promotionLevel;
  let rebirths = user.rebirths ?? 0;
  let didRebirth = false;
  if (gotPromoted) {
    const updated = await promoteUser(userId);
    newPromoLevel = updated.promotion_level;
    if (newPromoLevel >= MAX_PROMOTION_LEVEL) {
      const reborn = await rebirthUser(userId);
      newPromoLevel = reborn.promotion_level;
      rebirths = reborn.rebirths;
      didRebirth = true;
    }
  } else if (gotDemoted) {
    const updated = await demoteUser(userId);
    newPromoLevel = updated.promotion_level;
  }

  const title = getTitle(promotionLevel, user.rebirths ?? 0);
  const newTitle = getTitle(newPromoLevel, rebirths);

  const sickLine = gotSick ? `\nYou just got Ebola lol` : '';
  const promotionLine = didRebirth
    ? `\n<:davidwork:1514871951808528405> **REBIRTH!** You worked so hard you exploded and started over as **${newTitle}**!`
    : gotPromoted
    ? `\n<:davidwork:1514871951808528405> **PROMOTED!** You are now **${newTitle}**!`
    : gotDemoted
    ? `\n📉 **DEMOTED!** You are now **${newTitle}**, you fat chud!`
    : '';

  const shiftMessage = `<:davidwork:1514871951808528405> **${interaction.user.displayName}** (${title}) worked and earned **$${earned.toLocaleString()}**.${sickLine}${promotionLine}`;
  if (interaction.replied) {
    await interaction.followUp(shiftMessage);
  } else {
    await interaction.reply(shiftMessage);
  }
}
