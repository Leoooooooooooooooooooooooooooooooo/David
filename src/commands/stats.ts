import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { getOrCreateUser } from '../db/index.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription("Check someone's stats (or your own)")
  .addUserOption(option =>
    option.setName('user').setDescription('The user to check').setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser('user') ?? interaction.user;
  const guildId = interaction.guildId!;

  const user = await getOrCreateUser(target.id, guildId);

  const sanityBar = getSanityBar(user.sanity);

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${target.displayName}'s Stats`)
    .setThumbnail(target.displayAvatarURL())
    .setColor(getSanityColor(user.sanity))
    .addFields(
      { name: '⚡ XP', value: `${user.xp} XP`, inline: true },
      { name: '🎖️ Level', value: `${user.level}`, inline: true },
      { name: '📣 Status', value: `${user.status}`, inline: true },
      { name: '🧠 Sanity', value: `${sanityBar} ${user.sanity}/100`, inline: false },
      { name: '🌡️ Temperature', value: `${user.temperature}K`, inline: true },
      { name: '💀 Deaths', value: `${user.deaths}`, inline: true }
    )
    .setFooter({ text: getSanityMessage(user.sanity) })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

function getSanityBar(sanity: number): string {
  const filled = Math.round(sanity / 10);
  const empty = 10 - filled;
  return '🟩'.repeat(filled) + '⬛'.repeat(empty);
}

function getSanityColor(sanity: number): number {
  if (sanity > 60) return 0x57f287; // green
  if (sanity > 30) return 0xfee75c; // yellow
  return 0xed4245;                   // red
}

function getSanityMessage(sanity: number): string {
  if (sanity === 100) return 'Totally fine. Suspiciously fine.';
  if (sanity > 70) return 'Holding together.';
  if (sanity > 40) return 'Questionable life choices.';
  if (sanity > 10) return 'Please stop sending GIFs.';
  return 'One GIF away from death.';
}
