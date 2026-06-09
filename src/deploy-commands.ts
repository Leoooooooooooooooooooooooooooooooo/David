import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

import * as statsCommand from './commands/stats';
import * as leaderboardCommand from './commands/leaderboard';

const commands = [
  statsCommand.data.toJSON(),
  leaderboardCommand.data.toJSON(),
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log('Deploying slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
      { body: commands }
    );
    console.log('✅ Slash commands deployed.');
  } catch (error) {
    console.error(error);
  }
})();
