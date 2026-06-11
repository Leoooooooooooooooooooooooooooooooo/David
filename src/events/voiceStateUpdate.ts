import { Events, VoiceState } from 'discord.js';
import { addXp, hungerLoss, weightLoss } from '../db/index';

// Track when users joined VC: user_id -> join timestamp
const vcJoinTimes = new Map<string, number>();
const vcMinuteTracker = new Map<string, number>();

const XP_PER_MINUTE_IN_VC = 2;
const HUNGER_LOSS_PER_5_MINUTE_IN_VC = 1;
const WEIGHT_LOSS_PER_10_MINUTE_IN_VC = 1;
const VC_TICK_INTERVAL_MS = 60_000; // Award XP every 60 seconds

// Interval ticker for VC XP
setInterval(async () => {
  const now = Date.now();
  for (const [key, joinTime] of vcJoinTimes.entries()) {
    const [userId, guildId] = key.split(':');
    const minutesInVc = Math.floor((now - joinTime) / VC_TICK_INTERVAL_MS);
    if (minutesInVc > 0) {
      await addXp(userId, guildId, XP_PER_MINUTE_IN_VC);
      
      vcMinuteTracker.set(key, (vcMinuteTracker.get(key)) + 1);
      if (vcMinuteTracker.get(key) === 5){
        await hungerLoss(userId, HUNGER_LOSS_PER_5_MINUTE_IN_VC);
      }else if (vcMinuteTracker.get(key) >= 10){
        await hungerLoss(userId, HUNGER_LOSS_PER_5_MINUTE_IN_VC);
        await weightLoss(userId, WEIGHT_LOSS_PER_10_MINUTE_IN_VC);
        vcMinuteTracker.set(key, 0); // reset tracker after 10 minutes
      }
      
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
      vcMinuteTracker.set(key, 0); // reset minute tracker on new join
    }

    // User left VC
    if (oldState.channelId && !newState.channelId) {
      vcJoinTimes.delete(key);
      vcMinuteTracker.delete(key);
    }
  },
};
