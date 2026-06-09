import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { getLeaderboard } from '../db/index';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('See who is winning (or losing the most sanity)');

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const rows = await getLeaderboard(guildId);

  if (rows.length === 0) {
    await interaction.reply('Nobody has done anything yet. Disappointing.');
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];

  const description = await Promise.all(
    rows.map(async (row: any, i: number) => {
      const medal = medals[i] ?? `**${i + 1}.**`;
      let username = row.user_id;
      try {
        const user = await interaction.client.users.fetch(row.user_id);
        username = user.displayName;
      } catch {}

      return `${medal} **${username}** — ${row.xp} XP · Lvl ${row.level} · ${row.status} Status · 🧠 ${row.sanity}/100`;
    })
  );

  const embed = new EmbedBuilder()
    .setTitle('🏆 Leaderboard')
    .setDescription(description.join('\n'))
    .setColor(0x5865f2)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
