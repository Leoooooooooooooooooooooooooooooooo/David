import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, addMoney} from '../db/index';



export const data = new SlashCommandBuilder()
  .setName('gamble')
  .setDescription('Gamble your lifes savings away');

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const userId = interaction.user.id;
    const guildId = interaction.guildId!;

    const user = await getOrCreateUser(userId, guildId);

    const earned = Math.floor(Math.random() * ((user.money * 2) + 1));

    await addMoney(userId, -user.money);
    await addMoney(userId, earned);
    await interaction.reply(`🎰 **${interaction.user.displayName}** gambled and got **$${earned}**`);
  } catch (error) {
    console.error(error);
    await interaction.reply('Something went wrong!');
  }
}