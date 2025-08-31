import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { Client, Events, Collection, GatewayIntentBits } from "discord.js";
import { bisikan, greeting, nantiAjaBelinya, trigger } from "./response/index.js";
import { debug, richEmbed } from "./utility/index.js";
import dotenv from "dotenv";
import { getGamesAmerica } from "nintendo-switch-eshop";

dotenv.config();

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
let index;
let embeds;
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

// Load commands before starting the bot
loadCommands().then(() => {
  debug.info("Commands loaded successfully");
}).catch((error) => {
  debug.error("Error loading commands:", error);
});

client.once(Events.ClientReady, async (c) => {
  try {
    debug.success(`Logged in as ${c.user.tag}!`);
  } catch (error) {
    debug.error(error);
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    const uid = process.env.uid;
    let botMentioned = message.mentions.users.some((o) => o.id === uid);
    debug.info(
      `${message.member?.guild?.name} [${message.channel?.name}] - ${message.author?.username} - ${message}`
    );
    const author = `<@${message.author.id}>`;
    if (message.author.bot) return;
    if (botMentioned) {
      index = Math.floor(Math.random() * bisikan.length);
      return message.channel.send(bisikan[index]);
    }
    if (
      (message.content.toLowerCase().includes("nanti") ||
        message.content.toLowerCase().includes("ntar")) &&
      message.content.toLowerCase().includes("beli")
    ) {
      return message.channel.send(nantiAjaBelinya);
    }
    for (let i = 0; i < trigger.length; i++) {
      if (message.content.toLowerCase().includes(trigger[i])) {
        index = Math.floor(Math.random() * bisikan.length);
        return message.channel.send(bisikan[index]);
      }
    }
    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    const COMMAND_RESPONSE_ID = "responseid";
    const COMMAND_RESPONSE_EN = "responseen";
    const COMMAND_RULES = "rules";

    if (
      command === COMMAND_RESPONSE_ID ||
      command === COMMAND_RESPONSE_EN ||
      command === COMMAND_RULES
    ) {
      embeds = richEmbed(command);
      console.log(embeds);
      return message.channel.send({ embeds: [embeds] });
    }
    if (command === "greeting") {
      return message.channel.send(greeting(author));
    }
    if (command === "eshop-discount") {
      message.channel.send("bentar ya!");
      let id = 1;
      let array = [];
      let limit = 10;

      const response = await getGamesAmerica(["all"]);
      response
        .sort((a, b) => b.salePrice - a.salePrice)
        .every((element) => {
          if (
            element.salePrice != null &&
            element.platform == "Nintendo Switch"
          ) {
            let game = {
              id,
              title: element.title,
              releaseDate: element.releaseDateMask,
              availability: element.availability,
              price: element.msrp,
              salePrice: element.salePrice,
            };

            array.push(game);
            id++;
            if (id >= limit) {
              return false;
            }
            return array;
          }
        });
      debug.info(array);
      let stringResp = "";
      array.forEach((o) => {
        stringResp += `${o.title} - ${o.salePrice} \n`;
      });
      debug.info(stringResp);
      return message.channel.send("success");
    }
  } catch (err) {
    debug.error(err.response || err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    const command = interaction.client.commands.get(interaction.commandName);
    debug.info(command);
    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
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

server.listen(PORT, () => {
  debug.info(`Health check server running on port ${PORT}`);
});

client.login(process.env.token);
