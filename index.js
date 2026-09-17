import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { Client, Events, Collection, GatewayIntentBits } from "discord.js";
import { bisikan, greeting, nantiAjaBelinya, trigger } from "./response/index.js";
import { debug, richEmbed } from "./utility/index.js";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

// Fix for __dirname in ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
const prefix = "!";

client.commands = new Collection();

// Load commands asynchronously
async function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const fileURL = new URL(`file:///${filePath.replace(/\\/g, '/')}`);
    const command = await import(fileURL);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    // Handle both default export and named exports
    const cmd = command.default || command;
    if ("data" in cmd && "execute" in cmd) {
      client.commands.set(cmd.data.name, cmd);
    } else {
      debug.warn(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

client.once(Events.ClientReady, (c) => {
  debug.success(`Logged in as ${c.user.tag}!`);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    const content = message.content.toLowerCase();
    const botMentioned = message.mentions.users.has(client.user?.id);
    const author = `<@${message.author.id}>`;

    debug.info(
      `${message.guild?.name ?? "DM"} [${message.channel?.id}] - ${message.author.username} - ${message.content}`
    );

    if (botMentioned) {
      return message.channel.send(bisikan[Math.floor(Math.random() * bisikan.length)]);
    }
    if (
      (content.includes("nanti") || content.includes("ntar")) &&
      content.includes("beli")
    ) {
      return message.channel.send(nantiAjaBelinya);
    }
    if (trigger.some((word) => content.includes(word))) {
      return message.channel.send(bisikan[Math.floor(Math.random() * bisikan.length)]);
    }

    if (!content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift()?.toLowerCase();

    if (["responseid", "responseen", "rules"].includes(command)) {
      return message.channel.send({ embeds: [richEmbed(command)] });
    }
    if (command === "greeting") {
      return message.channel.send(greeting(author));
    }
  } catch (err) {
    debug.error(err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      debug.warn(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    await command.execute(interaction);
  } catch (error) {
    debug.error(error);
    const response = {
      content: "There was an error while executing this command!",
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response);
    } else {
      await interaction.reply(response);
    }
  }
});

// Simple HTTP server for Render.com port requirement
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      botStatus: client.readyAt ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bisikan Setan Bot is running! 🤖');
  }
});

function shutdown(signal) {
  debug.info(`Received ${signal}; shutting down.`);
  server.close(() => process.exit(0));
  client.destroy();
  setTimeout(() => process.exit(1), 10_000).unref();
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

async function start() {
  if (!process.env.token) {
    throw new Error("Missing required environment variable: token");
  }

  await loadCommands();
  debug.info("Commands loaded successfully");

  await listen(server, PORT);
  debug.info(`Health check server running on port ${PORT}`);

  await client.login(process.env.token);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

start().catch((error) => {
  debug.error(error);
  process.exitCode = 1;
});
