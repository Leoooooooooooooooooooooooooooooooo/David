import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { getOrCreateUser, hungerLoss } from '../db/index';

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

  const sanityBar = getBar(user.sanity);
  const hungerBar = getBar(user.hunger);
  const weightBar = getBar(user.weight);
  
  const insuranceStatus = user.insurance_paid
    ? `✅ Paid on ${new Date(user.insurance_paid_at).toLocaleDateString('en-CA')}`
    : '❌ Unpaid lol';

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${target.displayName}'s Stats`)
    .setThumbnail(target.displayAvatarURL())
    .setColor(getSanityColor(user.sanity))
    .addFields(
      { name: '<:davidexp:1513930783935565975> XP', value: `${user.xp} XP`, inline: true },
      { name: '<:davidlevel:1513942942241390744> Level', value: `${user.level}`, inline: true },
      { name: '<:davidstatus:1513942961191129292> Status', value: `${user.status}`, inline: true },
      { name: '<:davidsanity:1513942977586659420> Sanity', value: `${sanityBar} ${user.sanity}/100`, inline: false },
      { name: '🍽️ Stomach', value: `${hungerBar} ${user.hunger}/100`, inline: false },
      { name: '⚖️ Weight', value: `${weightBar} ${user.weight}/100`, inline: false },
      { name: user.temperature < 0 ? '❄️ Temperature' : '🔥 Temperature', value: `${user.temperature}K`, inline: true },
      { name: '<:daviddeath:1513943034738245794> Deaths', value: `${user.deaths}`, inline: true },
      { name: '💵 Money', value: `$${user.money}`, inline: true },
      { name: '🌵 Dryness', value: `${getBar(user.dryness)} ${user.dryness}/100`, inline: false },
      { name: '🤧 Sick', value: user.is_sick ? 'Yes' : 'No', inline: true },
      { name: '📋 Insurance', value: insuranceStatus, inline: true }
    )
    .setFooter({ text: getSanityMessage(user.sanity) })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

function getBar(value: number): string {
  const filled = Math.round(value / 10);
  const empty = 10 - filled;
  return '🟩'.repeat(filled) + '⬛'.repeat(empty);
}

function getSanityColor(sanity: number): number {
  if (sanity > 60) return 0x57f287; // green
  if (sanity > 30) return 0xfee75c; // yellow
  return 0xed4245;                   // red
}

function getSanityMessage(sanity: number): string {
  if (sanity === 100) return 'Just send a GIF, trust me bro.';
  if (sanity > 70) return 'Okay enough GIFs bro.';
  if (sanity > 40) return 'Seriously bro no more GIFs.';
  if (sanity > 10) return 'Please stop sending GIFs.';
  return 'Dude... the noises';
}
