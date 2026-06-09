import { Events, VoiceState } from 'discord.js';
import { addXp } from '../db/index';

// Track when users joined VC: user_id -> join timestamp
const vcJoinTimes = new Map<string, number>();

const XP_PER_MINUTE_IN_VC = 2;
const VC_TICK_INTERVAL_MS = 60_000; // Award XP every 60 seconds

// Interval ticker for VC XP
setInterval(async () => {
  const now = Date.now();
  for (const [key, joinTime] of vcJoinTimes.entries()) {
    const [userId, guildId] = key.split(':');
    const minutesInVc = Math.floor((now - joinTime) / VC_TICK_INTERVAL_MS);
    if (minutesInVc > 0) {
      await addXp(userId, guildId, XP_PER_MINUTE_IN_VC);
      // Reset their join time so we don't double-award
      vcJoinTimes.set(key, now);
    }
  }
}, VC_TICK_INTERVAL_MS);

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState: VoiceState, newState: VoiceState) {
    const userId = newState.member?.user.id ?? oldState.member?.user.id;
    const guildId = newState.guild.id;

    if (!userId) return;
    if (newState.member?.user.bot) return;

    const key = `${userId}:${guildId}`;

    // User joined a VC
    if (!oldState.channelId && newState.channelId) {
      vcJoinTimes.set(key, Date.now());
    }

    // User left VC
    if (oldState.channelId && !newState.channelId) {
      vcJoinTimes.delete(key);
    }
  },
};
