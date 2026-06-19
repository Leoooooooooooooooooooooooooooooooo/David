import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, killUser, setSick, addMoney, spendMoney, loseSanity, gainSanity } from '../db/index';

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 60 * 60 * 1000;

export const data = new SlashCommandBuilder()
  .setName('stroll')
  .setDescription('Go for a lovely stroll and be one with nature. Regain some sanity. Maybe.');

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;

  const lastUsed = cooldowns.get(userId) ?? 0;
  const remaining = COOLDOWN_MS - (Date.now() - lastUsed);
  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60_000);
    await interaction.reply({ content: `🌿 You just went for a walk. Rest for **${mins} more minute(s)** first.`, ephemeral: true });
    return;
  }

  const user = await getOrCreateUser(userId, guildId);
  cooldowns.set(userId, Date.now());

  const roll = Math.random();

  if (roll < 0.05) {
    // Bear attack
    await killUser(userId);
    await interaction.reply(
      `🐻 **${interaction.user.displayName}** went for a peaceful stroll and got MAULED BY A BEAR. They are dead now. Nature is not your friend.`
    );
  } else if (roll < 0.15) {
    // Rabid raccoon
    await setSick(userId, true);
    await interaction.reply(
      `🦝 A raccoon leaped out of the bushes and bit **${interaction.user.displayName}**. They now have RABIES. Seek medical attention immediately.`
    );
  } else if (roll < 0.25) {
    // Robbed
    const lostFraction = 0.20 + Math.random() * 0.30;
    const lostAmount = Math.floor(user.money * lostFraction);
    if (lostAmount > 0) {
      await spendMoney(userId, lostAmount);
      await interaction.reply(
        `🔪 **${interaction.user.displayName}** got jumped on their stroll and robbed of **$${lostAmount}**. Should've stayed inside.`
      );
    } else {
      await interaction.reply(
        `🔪 **${interaction.user.displayName}** got held up by a mugger... but was completely broke. The mugger felt bad and left.`
      );
    }
  } else if (roll < 0.38) {
    // Find a penny
    const found = Math.floor(Math.random() * 6) + 10;
    await addMoney(userId, found);
    await interaction.reply(
      `🪙 **${interaction.user.displayName}** found a penny on the ground. It was inexplicably worth **$${found}**. Nice.`
    );
  } else if (roll < 0.50) {
    // Step on a bee
    const result = await loseSanity(userId, guildId, 5);
    if (result.died) {
      await interaction.reply(
        `<:daviddeath:1513943034738245794> **${interaction.user.displayName}** stepped on a bee, had a complete mental breakdown, and DIED.`
      );
    } else {
      await interaction.reply(
        `🐝 **${interaction.user.displayName}** stepped on a bee. Lost **5 sanity** (${result.sanity} remaining). Should've worn shoes.`
      );
    }
  } else if (roll < 0.60) {
    // Find $20 in old jacket
    const found = Math.floor(Math.random() * 11) + 20;
    await addMoney(userId, found);
    await interaction.reply(
      `🧥 **${interaction.user.displayName}** found **$${found}** in an old jacket pocket on a park bench. Finders keepers.`
    );
  } else if (roll < 0.72) {
    // Beautiful sunset
    const gained = Math.floor(Math.random() * 11) + 10;
    await gainSanity(userId, gained);
    await interaction.reply(
      `🌅 **${interaction.user.displayName}** witnessed a genuinely beautiful sunset. Gained **${gained} sanity**.`
    );
  } else if (roll < 0.84) {
    // Meet a friendly dog
    const gained = Math.floor(Math.random() * 16) + 15;
    await gainSanity(userId, gained);
    await interaction.reply(
      `🐕 **${interaction.user.displayName}** met a very good dog on their walk and pet it extensively. Gained **${gained} sanity**.`
    );
  } else if (roll < 0.92) {
    // Tripped and fell
    const result = await loseSanity(userId, guildId, 3);
    if (result.died) {
      await interaction.reply(
        `<:daviddeath:1513943034738245794> **${interaction.user.displayName}** tripped on the sidewalk, hit their head, and died of embarrassment.`
      );
    } else {
      await interaction.reply(
        `🩹 **${interaction.user.displayName}** tripped on the sidewalk and fell in front of several witnesses. Lost **3 sanity** from the humiliation (${result.sanity} remaining).`
      );
    }
  } else {
    // Peaceful walk
    const gained = Math.floor(Math.random() * 6) + 5;
    await gainSanity(userId, gained);
    await interaction.reply(
      `🌿 **${interaction.user.displayName}** went for a peaceful stroll and felt considerably more sane. Gained **${gained} sanity**.`
    );
  }
}
