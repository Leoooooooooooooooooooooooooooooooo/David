import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { getLeaderboard } from '../db/index';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('See who is actually winning');

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const rows = await getLeaderboard(guildId);

  if (rows.length === 0) {
    await interaction.reply('Nobody has done anything yet');
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

      const flags = [
        row.is_sick ? '<:davidsick:1514872041822617630>' : null,
        !row.taxes_paid ? '📋❌' : null,
        !row.insurance_paid ? '🛡️❌' : null,
      ].filter(Boolean).join(' ');

      return (
        `${medal} **${username}** — Score: **${row.score}**\n` +
        `　XP ${row.xp} · Lvl ${row.level} · $${row.money} · <:davidsanity:1513942977586659420> ${row.sanity}/100 · <:daviddeath:1513943034738245794> ${row.deaths}` +
        (flags ? ` · ${flags}` : '')
      );
    })
  );

  const embed = new EmbedBuilder()
    .setTitle('🏆 Leaderboard')
    .setDescription(description.join('\n\n'))
    .setColor(0x5865f2)
    .setFooter({ text: 'Score = XP + money×2 + status×5 + sanity×3 + insurance bonus ± tax/sick penalties' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
