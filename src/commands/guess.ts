import { SlashCommandBuilder } from 'discord.js';
import { isEventActive, processGuess, WRONG_GUESS_SANITY_COST } from '../evilEvent';
import { loseSanity, killUser } from '../db/index';

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
  const userId: string = interaction.user.id;
  const guildId: string = interaction.guildId!;

  if (!isEventActive()) {
    await interaction.reply({ content: "There's no evil event happening right now.", ephemeral: true });
    return;
  }

  if (!/^[a-zA-Z]{5}$/.test(word)) {
    await interaction.reply({ content: 'Your guess must be exactly **5 letters** (A–Z only).', ephemeral: true });
    return;
  }

  const username: string = (interaction.member as any)?.displayName ?? interaction.user.username;

  const result = processGuess(word, userId);
  if (!result) {
    await interaction.reply({ content: "There's no evil event happening right now.", ephemeral: true });
    return;
  }

  if (result.outOfGuesses) {
    await killUser(userId);
    await interaction.reply(
      `<:daviddeath:1513943034738245794> **${username}** already used all their guesses and tried again anyway. David noticed. **${username} is dead.**`
    );
    return;
  }

  if (result.isCorrect) {
    await interaction.reply(
      `🎉 **${username}** cracked my evil password...\n` +
      `${result.hint}\n\n` +
      `The word was **${result.secretWord!.toUpperCase()}**.\n` +
      `Fuck you guessed my password. Whatever I dont even care. You win I guess.`
    );
  } else {
    const sanityResult = await loseSanity(userId, guildId, WRONG_GUESS_SANITY_COST);
    const guessesLeft = result.guessesRemaining!;

    const lastGuessWarning = guessesLeft === 0
      ? `\n<:davidanger:1514871838360993804> **That was your last guess. If you guess again, David will kill you.**`
      : '';

    if (sanityResult.died) {
      await interaction.reply(
        `**${username}** guesses \`${word.toUpperCase()}\`:\n${result.hint}\n\n` +
        `<:daviddeath:1513943034738245794> Lost **${WRONG_GUESS_SANITY_COST} sanity** and DIED from the humiliation of being wrong. **0 guesses remaining.**`
      );
    } else {
      await interaction.reply(
        `**${username}** guesses \`${word.toUpperCase()}\`:\n${result.hint}\n\n` +
        `Lost **${WRONG_GUESS_SANITY_COST} sanity** (${sanityResult.sanity} left). ` +
        (guessesLeft > 0 ? `**${guessesLeft} guess${guessesLeft === 1 ? '' : 'es'} remaining.**` : `**No guesses remaining.**`) +
        lastGuessWarning
      );
    }
  }
}
