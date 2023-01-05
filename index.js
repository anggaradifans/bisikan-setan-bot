const fs = require('node:fs');
const path = require('node:path');

import { Client, Events, Collection, GatewayIntentBits } from "discord.js";
import { bisikan, greeting, trigger } from "./response";
import { debug, richEmbed } from "./utility";
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
let index;
let embeds;
const prefix = "!";

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		debug.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

client.once(Events.ClientReady, c => {
  debug.success(`Logged in as ${c.user.tag}!`);
});

client.on(Events.MessageCreate, async message => {
  try {
    const uid = process.env.uid
    // let botMentioned; 
    // message.mentions.users.map(o => {
    //   if(o.id === uid){
    //     botMentioned = true
    //   }
    // })
    debug.info(
      `${message.member.guild.name} [${message.channel.name}] - ${message.author.username}#${message.author.discriminator} - ${message}`
    );
    const author = `<@${message.author.id}>`;
    if (message.author.bot) return;
    if(message.content === `<@${uid}>`){
      return message.channel.send("Ya? mau nanya apa?")
    }
    for(let i = 0; i < trigger.length; i++){
      if (
        message.content.toLowerCase().includes(trigger[i])
      ) {
        index = Math.floor(Math.random() * bisikan.length);
        return message.channel.send(bisikan[index]);
      }
    }
    // const args = message.content.slice(prefix.length).split(/ +/);
    // const command = args.shift().toLowerCase();

    // if(command === "responseid" || command === "responseen" || command === "rules"){
    //   embeds = richEmbed(command);
    //   console.log(embeds)
    //   return message.channel.send({ embeds: [embeds] });
    // }
    // if (command === "greeting"){
    //   return message.channel.send(greeting(author));
    // }

  } catch (err) {
    debug.error(err.response);
  }
});

client.on(Events.InteractionCreate, async interaction => {
	const command = interaction.client.commands.get(interaction.commandName);
  debug.info(command)
	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});
client.login(process.env.token);
