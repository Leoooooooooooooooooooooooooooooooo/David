import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

import * as statsCommand from './commands/stats';
import * as leaderboardCommand from './commands/leaderboard';
import * as eatCommand from './commands/eat';
import * as insuranceCommand from './commands/insurance';
import * as moisturizeCommand from './commands/moisturize';
import * as workCommand from './commands/work';
import * as recoverCommand from './commands/recover';
import * as guessCommand from './commands/guess';
import * as gambleCommand from './commands/gamble';
import * as assassinateCommand from './commands/assassinate';
import * as strollCommand from './commands/stroll';
import * as giftCommand from './commands/gift';
import * as taxesCommand from './commands/taxes';


const commands = [
  statsCommand.data.toJSON(),
  leaderboardCommand.data.toJSON(),
  eatCommand.data.toJSON(),
  insuranceCommand.data.toJSON(),
  moisturizeCommand.data.toJSON(),
  workCommand.data.toJSON(),
  recoverCommand.data.toJSON(),
  guessCommand.data.toJSON(),
  gambleCommand.data.toJSON(),
  assassinateCommand.data.toJSON(),
  strollCommand.data.toJSON(),
  giftCommand.data.toJSON(),
  taxesCommand.data.toJSON(),
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
