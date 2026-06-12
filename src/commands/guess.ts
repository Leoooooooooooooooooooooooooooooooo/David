import { SlashCommandBuilder } from 'discord.js';
import { isEventActive, processGuess } from '../evilEvent';

export const data = new SlashCommandBuilder()
  .setName('guess')
  .setDescription("Guess David's evil password")
  .addStringOption(option =>
    option.setName('word')
      .setDescription('Your 5-letter guess')
      .setRequired(true)
  );

export async function execute(interaction: any) {
  const word = interaction.options.getString('word', true) as string;

  if (!isEventActive()) {
    await interaction.reply({ content: "There's no evil event happening right now.", ephemeral: true });
    return;
  }

  if (!/^[a-zA-Z]{5}$/.test(word)) {
    await interaction.reply({ content: 'Your guess must be exactly **5 letters** (A–Z only).', ephemeral: true });
    return;
  }

  const result = processGuess(word);
  if (!result) {
    await interaction.reply({ content: "There's no evil event happening right now.", ephemeral: true });
    return;
  }

  const username: string = (interaction.member as any)?.displayName ?? interaction.user.username;

  if (result.isCorrect) {
    await interaction.reply(
      `🎉 **${username}** cracked my evil password...\n` +
      `${result.hint}\n\n` +
      `The word was **${result.secretWord!.toUpperCase()}**.\n` +
      `Fuck you guessed my password. Whatever I dont even care. You win I guess.`
    );
  } else {
    await interaction.reply(
      `**${username}** guesses \`${word.toUpperCase()}\`:\n${result.hint}`
    );
  }
}
