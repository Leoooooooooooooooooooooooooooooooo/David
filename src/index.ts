import { Client, Collection, Events, GatewayIntentBits, Interaction } from 'discord.js';
import dotenv from 'dotenv';
import { initDb, regenSanityAll, decreaseDrynessAll } from './db/index';


import readyEvent from './events/ready';
import messageCreateEvent from './events/messageCreate';
import voiceStateUpdateEvent from './events/voiceStateUpdate';

import * as statsCommand from './commands/stats';
import * as leaderboardCommand from './commands/leaderboard';
import * as moisturizeCommand from './commands/moisturize';
import * as insuranceCommand from './commands/insurance';
import * as eatCommand from './commands/eat';
import * as workCommand from './commands/work';
import * as recoverCommand from './commands/recover';


dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const commands = new Collection<string, { data: any; execute: Function }>();
commands.set(statsCommand.data.name, statsCommand);
commands.set(leaderboardCommand.data.name, leaderboardCommand);
commands.set(moisturizeCommand.data.name, moisturizeCommand);
commands.set(insuranceCommand.data.name, insuranceCommand);
commands.set(eatCommand.data.name, eatCommand);
commands.set(workCommand.data.name, workCommand);
commands.set(recoverCommand.data.name, recoverCommand);

client.once(Events.ClientReady, (c) => readyEvent.execute(c));
client.on(Events.MessageCreate, (msg) => messageCreateEvent.execute(msg));
client.on(Events.VoiceStateUpdate, (oldState, newState) => voiceStateUpdateEvent.execute(oldState, newState));

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    const msg = { content: 'Something broke. Probably your fault.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg);
    } else {
      await interaction.reply(msg);
    }
  }
});

initDb()
  .then(() => {
    setInterval(() => regenSanityAll(), 5 * 60 * 1000);
    setInterval(() => decreaseDrynessAll(), 10 * 60 * 1000);
    return client.login(process.env.DISCORD_TOKEN);
  })
  .catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
  });