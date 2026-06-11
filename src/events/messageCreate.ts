import { Events, Message, TextChannel, NewsChannel } from 'discord.js';

function isSendableChannel(channel: any): channel is TextChannel | NewsChannel {
  return channel && typeof channel.send === 'function';
}

import { addXp, addStatus, loseSanity, killUser, randomizeTemperature, hungerLoss, weightLoss } from '../db/index';

const XP_PER_MESSAGE = 5;
const SANITY_LOSS_PER_GIF = 10;
const STATUS_PER_PING = 3;

const HUNGER_PER_MESSAGE = 2;
const WEIGHT_PER_MESSAGE = 1;

const xpCooldowns = new Map<string, number>();
const XP_COOLDOWN_MS = 10_000;
const WORK_COOLDOWNS = new Map<string, number>();
const WORK_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

function isGif(message: Message): boolean {
  if (message.content.match(/\.gif(\?|$)/i)) return true;
  if (message.content.match(/https?:\/\/(tenor\.com|giphy\.com|media\.tenor\.com)\//i)) return true;
  for (const attachment of message.attachments.values()) {
    if (attachment.contentType === 'image/gif' || attachment.name?.endsWith('.gif')) return true;
  }
  for (const embed of message.embeds) {
    if (embed.image?.url?.endsWith('.gif')) return true;
    if (embed.thumbnail?.url?.endsWith('.gif')) return true;
    if (embed.url?.includes('tenor.com') || embed.url?.includes('giphy.com')) return true;
  }
  return false;
}

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot || !message.guild) return;
    // Detect Personal Topics lol
    if (message.content.match(/\binsurance\b/i) && !message.content.startsWith('/')) {
      if (isSendableChannel(message.channel)) {
        await message.channel.send(
          `please don't talk about personal topics :(\n\n**Trauma dumping** (n.): The unsolicited oversharing of personal pain, distress, or hardship with someone who did not consent to receiving it or insurance. Often occurs in casual settings. Please speak to a licensed professional instead. Thank you.`
        );
      }
    }
    console.log(`Message from ${message.author.tag} | attachments: ${message.attachments.size} | embeds: ${message.embeds.length} | content: ${message.content.substring(0, 100)}`);
    const userId = message.author.id;
    const guildId = message.guild.id;

    const lastMessage = xpCooldowns.get(userId) ?? 0;
    const now = Date.now();
    if (now - lastMessage > XP_COOLDOWN_MS) {
      xpCooldowns.set(userId, now);
      const updated = await addXp(userId, guildId, XP_PER_MESSAGE);
      const hungerUpdated = await hungerLoss(userId, HUNGER_PER_MESSAGE);
      const weightUpdated = await weightLoss(userId, WEIGHT_PER_MESSAGE);

      const oldLevel = Math.floor((updated.xp - XP_PER_MESSAGE) / 100) + 1;
      const newLevel = updated.level;

      if (newLevel > oldLevel) {
        await randomizeTemperature(userId);
        if (isSendableChannel(message.channel)) {
          await message.channel.send(
            `⚠️ **${message.author.displayName}** leveled up to **Level ${newLevel}**! Super Sigma! EVERYONE START FREAKING OUT RIGHT NOW!!!!!111!!!!`
          );
        }
      }
    }

    if (message.mentions.users.size > 0) {
      for (const [mentionedId, mentionedUser] of message.mentions.users) {
        if (mentionedUser.bot) continue;
        await addStatus(mentionedId, guildId, STATUS_PER_PING);
      }
    }

    if (isGif(message)) {
      const updated = await loseSanity(userId, guildId, SANITY_LOSS_PER_GIF);
      await message.react('<:davidsanity:1513942977586659420>');

      if (updated.sanity <= 0) {
        await killUser(userId);
        const deathMessages = [
          `<:daviddeath:1513943034738245794> **${message.author.displayName}** died lol`,
          `<:daviddeath:1513943034738245794> **${message.author.displayName}** was driven crazy by the sounds`,
          `<:daviddeath:1513943034738245794> **${message.author.displayName}** GIFed like a noob`,
        ];
        const msg = deathMessages[Math.floor(Math.random() * deathMessages.length)];
        if (isSendableChannel(message.channel)) await message.channel.send(msg);
      } else if (updated.sanity <= 20) {
        if (isSendableChannel(message.channel)) {
          await message.channel.send(
            `⚠️ **${message.author.displayName}** has ${updated.sanity} sanity left and is hearing the noises`
          );
        }
      }
    }
  },
};