import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, hungerGain, loseSanity} from '../db/index';

export const data = new SlashCommandBuilder()
  .setName('eat')
  .setDescription('Eat food that may or may not maybe kill you or something');

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;
  
  await getOrCreateUser(userId, guildId);

  const gain = Math.floor(Math.random() * 100);
  const alergic = Math.random() <= 0.05;

  if (alergic == false) {
    const updated = await hungerGain(userId,gain);
    
  }else {
    const updated = await loseSanity(userId,guildId,20)
  }
  
  if (alergic == false) await interaction.reply(
    `🍽️ **${interaction.user.displayName}** ate food. Stomach is now **${updated.hunger}%** full! How scrumptious!!`
  );

  if (alergic == true) await interaction.reply(
    `err... yipes!!! Looks like you ate something you're alergic to... **-20 sanity**...`
  );
  
  }
