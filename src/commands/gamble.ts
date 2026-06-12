import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, addMoney} from '../db/index';



export const data = new SlashCommandBuilder()
  .setName('gamble')
  .setDescription('Gabmle your lifes savings away');

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;

  const user = await getOrCreateUser(userId, guildId);
user.money



const earned = Math.floor(Math.random() * ((user.money * 2) + 1)); //between 0 and double all of their money

addMoney(userId, -user.money); 
addMoney(userId, earned);
 
}