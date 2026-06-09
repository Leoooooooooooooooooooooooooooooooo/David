import { Events, Message, TextChannel, NewsChannel } from 'discord.js';

function isSendableChannel(channel: any): channel is TextChannel | NewsChannel {
  return channel && typeof channel.send === 'function';
}
import { addXp, addStatus, loseSanity, killUser, randomizeTemperature } from '../db/index.js';

const XP_PER_MESSAGE = 5;
const SANITY_LOSS_PER_GIF = 10;
const STATUS_PER_PING = 3;

// Cooldown map to prevent XP farming (user_id -> last message timestamp)
const xpCooldowns = new Map<string, number>();
const XP_COOLDOWN_MS = 10_000; // 10 seconds

function isGif(message: Message): boolean {
  // Check for Tenor/Giphy links
  if (message.content.match(/https?:\/\/(tenor\.com|giphy\.com|media\.tenor\.com)\//i)) return true;

  // Check for attachments that are GIFs
  for (const attachment of message.attachments.values()) {
    if (attachment.contentType === 'image/gif' || attachment.name?.endsWith('.gif')) return true;
  }

  // Check for embeds that are GIFs
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

    const userId = message.author.id;
    const guildId = message.guild.id;

    // --- XP from messaging (with cooldown) ---
    const lastMessage = xpCooldowns.get(userId) ?? 0;
    const now = Date.now();
    if (now - lastMessage > XP_COOLDOWN_MS) {
      xpCooldowns.set(userId, now);
      const updated = await addXp(userId, guildId, XP_PER_MESSAGE);
      const oldLevel = Math.floor((updated.xp - XP_PER_MESSAGE) / 100) + 1;
      const newLevel = updated.level;

      if (newLevel > oldLevel) {
        await randomizeTemperature(userId);
        if (isSendableChannel(message.channel)) {
          await message.channel.send(
            `📈 **${message.author.displayName}** leveled up to **Level ${newLevel}**! (probably won't help them)`
          );
        }
      }
    }

    // --- Status from being pinged ---
    if (message.mentions.users.size > 0) {
      for (const [mentionedId, mentionedUser] of message.mentions.users) {
        if (mentionedUser.bot) continue;
        await addStatus(mentionedId, guildId, STATUS_PER_PING);
      }
    }

    // --- Sanity loss from GIFs ---
    if (isGif(message)) {
      const updated = await loseSanity(userId, guildId, SANITY_LOSS_PER_GIF);
      await message.react('🧠');

      if (updated.sanity <= 0) {
        // DEATH
        await killUser(userId);

        const deathMessages = [
          `💀 **${message.author.displayName}** has sent one too many GIFs and died. All stats reset. Embarrassing.`,
          `💀 **${message.author.displayName}**'s sanity finally gave out. Stats wiped. The GIFs were not worth it.`,
          `💀 **${message.author.displayName}** is dead. Cause of death: GIFs. All progress lost.`,
        ];

        const msg = deathMessages[Math.floor(Math.random() * deathMessages.length)];
        if (isSendableChannel(message.channel)) await message.channel.send(msg);
      } else if (updated.sanity <= 20) {
        if (isSendableChannel(message.channel)) {
          await message.channel.send(
            `⚠️ **${message.author.displayName}** has ${updated.sanity} sanity left. Tread carefully.`
          );
        }
      }
    }
  },
};
