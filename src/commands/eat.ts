import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, hungerGain, loseSanity, weightGain} from '../db/index';

export const data = new SlashCommandBuilder()
  .setName('eat')
  .setDescription('Eat food that may or may not maybe kill you or something')
  .addUserOption(option =>
    option.setName('user').setDescription('The user to feed').setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;
  
  const user = await getOrCreateUser(userId, guildId);

  const gain = Math.floor(Math.random() * 99)+1;
  const alergic = Math.random() <= 0.05;
  const gainovermax = (user.hunger + gain) - 100;

  if (gainovermax > 0) {
    const weightGain = Math.floor((gain - gainovermax) / 2) + gainovermax;
  } else {
    const weightGain = Math.floor(gain / 2);
  }

  if (alergic == false) {
    const updated = await hungerGain(userId,gain);
    await weightGain(userId,weightGain);
  }else {
    const updated = await loseSanity(userId,guildId,20);
  }
  
  if (alergic == false) await interaction.reply(
    `🍽️ **${interaction.user.displayName}** ate food. Stomach is now **${updated.hunger}%** full! How scrumptious!!`
  );

  if (alergic == true) await interaction.reply(
    `err... yipes!!! Looks like you ate something you're alergic to... **-20 sanity**...`
  );
  
  }
