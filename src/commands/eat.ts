import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, hungerGain} from '../db/index';

export const data = new SlashCommandBuilder()
  .setName('eat')
  .setDescription('Eat food that may or may not maybe kill you or something');

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;

  const user = await hungerGain(userId,20)

  
  }
