import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, addMoney,loseSanity} from '../db/index';



export const data = new SlashCommandBuilder()
  .setName('gamble')
  .setDescription('Gamble your lifes savings away');

export async function execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId!;

  const user = await getOrCreateUser(userId, guildId);


await loseSanity(userId,guildId,5); 
const currentMoney = user.money;
const jackpotRoll = Math.floor(Math.random() * 1000) + 1;
let earned =0;
let isJackpot = false;
if (jackpotRoll === 1) {
    earned = user.money +1000;
    isJackpot = true;
} else {
earned = Math.floor(Math.random() * ((user.money * 2.5) + 1)); //between 0 and 2.5 all of their money
}
const netChange = earned - user.money;

await addMoney(userId, netChange); 
if (isJackpot) {
await interaction.reply(`🎉 YOU HIT THE JACKPOT! **${interaction.user.displayName}** had **$${currentMoney}**, gambled and now has $1000 more! your so rich! with a total of **$${earned}**`);
} else {
await interaction.reply(`🎰 **${interaction.user.displayName}** had **$${currentMoney}**, gambled and now has **$${earned}**`);
}

}