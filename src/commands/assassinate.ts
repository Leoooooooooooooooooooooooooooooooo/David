import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, killUser, spendMoney } from '../db/index';

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 10 * 60 * 1000;
const MIN_COST = 10;

export const data = new SlashCommandBuilder()
  .setName('assassinate')
  .setDescription('Hire a hitman to eliminate someone. Costs 50% of their money.')
  .addUserOption(option =>
    option.setName('target').setDescription('Your target').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;
  const target = interaction.options.getUser('target', true);

  if (target.id === userId) {
    await interaction.reply({ content: 'You cannot assassinate yourself. Seek help.', ephemeral: true });
    return;
  }
  if (target.bot) {
    await interaction.reply({ content: 'You cannot assassinate a bot.', ephemeral: true });
    return;
  }

  const lastUsed = cooldowns.get(userId) ?? 0;
  const remaining = COOLDOWN_MS - (Date.now() - lastUsed);
  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60_000);
    await interaction.reply({ content: `⏳ Lay low for **${mins} more minute(s)** before attempting another hit.`, ephemeral: true });
    return;
  }

  const user = await getOrCreateUser(userId, guildId);
  const targetUser = await getOrCreateUser(target.id, guildId);

  const cost = Math.max(MIN_COST, Math.floor(targetUser.money * 0.5));

  if (user.money < cost) {
    await interaction.reply({
      content: `🔫 Hiring a hitman on **${target.displayName}** costs **$${cost}** (50% of their $${targetUser.money}). You only have **$${user.money}**. Stay broke.`,
      ephemeral: true,
    });
    return;
  }

  await spendMoney(userId, cost);
  cooldowns.set(userId, Date.now());

  const roll = Math.random();

  if (roll < 0.50) {
    await interaction.reply(
      `🔫 **${interaction.user.displayName}** paid **$${cost}** to have **${target.displayName}** killed... and the hitman completely botched it. Money gone. Target alive. Embarrassing.`
    );
  } else if (roll < 0.75) {
    await killUser(userId);
    await interaction.reply(
      `💀 **${interaction.user.displayName}** tried to assassinate **${target.displayName}**... and got double-crossed by their own hitman. Paid $${cost} to die. Incredible.`
    );
  } else {
    await killUser(target.id);
    await interaction.reply(
      `☠️ **${interaction.user.displayName}** paid **$${cost}** and successfully had **${target.displayName}** eliminated. Cold.`
    );
  }
}
