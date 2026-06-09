import { Client, Collection, Events, GatewayIntentBits, Interaction } from 'discord.js';
import dotenv from 'dotenv';
import { initDb } from './db/index.js';

// Events
import readyEvent from './events/ready.js';
import messageCreateEvent from './events/messageCreate.js';
import voiceStateUpdateEvent from './events/voiceStateUpdate.js';

// Commands
import * as statsCommand from './commands/stats.js';
import * as leaderboardCommand from './commands/leaderboard.js';

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

// Register commands into a collection
const commands = new Collection<string, { data: any; execute: Function }>();
commands.set(statsCommand.data.name, statsCommand);
commands.set(leaderboardCommand.data.name, leaderboardCommand);

// Register events
client.once(Events.ClientReady, (c) => readyEvent.execute(c));
client.on(Events.MessageCreate, (msg) => messageCreateEvent.execute(msg));
client.on(Events.VoiceStateUpdate, (oldState, newState) => voiceStateUpdateEvent.execute(oldState, newState));

// Handle slash commands
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

// Init DB then login
initDb()
  .then(() => client.login(process.env.DISCORD_TOKEN))
  .catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
