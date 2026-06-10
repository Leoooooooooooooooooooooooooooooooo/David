import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, hungerGain} from '../db/index';

export const data = new SlashCommandBuilder()
  .setName('eat')
  .setDescription('Eat food that may or may not maybe kill you or something');

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;
  
  await getOrCreateUser(userId, guildId);
  const updated = await hungerGain(userId,20);
  
  await interaction.reply(
    `🍽️ **${interaction.user.displayName}** ate food. Hunger is now **${updated.hunger}%**. How scrumptious!.`
  );
  
  }
