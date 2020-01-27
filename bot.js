import { Client, RichEmbed } from "discord.js";
import { bisikan, advice, getResponseList, greeting } from "./response";
import fetch from "node-fetch";
// import { logger } from "./utility/logger";
import debug from "./utility/logger2";
import { stringify } from "querystring";
require("dotenv").config();

const trim = (str, max) =>
  str.length > max ? `${str.slice(0, max - 3)}...` : str;

const client = new Client();
let index;
let embed;
const prefix = "!";

client.on("ready", () => {
  debug.success(`Logged in as ${client.user.tag}!`);
});

client.on("message", async message => {
  try {
    debug.info(
      `${message.author.username}#${message.author.discriminator} - ${message.content}`
    );
    const author = `<@${message.author.id}>`;
    if (message.author.bot) return;
    if (
      message.content.toLowerCase().includes("beli") ||
      message.content.toLowerCase().startsWith("beli")
    ) {
      index = Math.floor(Math.random() * bisikan.length);
      return message.channel.send(bisikan[index]);
    }
    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    switch (command) {
      case "responseid":
        embed = new RichEmbed()
          .setColor("#F08080")
          .addField("Response", trim(getResponseList(bisikan), 1024));
        message.channel.send(embed);
        break;
      case "responseen":
        embed = new RichEmbed()
          .setColor("#F08080")
          .addField("Response", trim(getResponseList(advice), 1024));
        message.channel.send(embed);
        break;
      case "rules":
        embed = new RichEmbed()
          .setColor("#F08080")
          .setTitle("BisikanSetanBot")
          .setThumbnail("https://i.imgur.com/wSTFkRM.png")
          .addField("Commands", "!responseID \n !responseEN")
          .addField("Beli", "Jangan ketik beli kalo gak mau disetanin");
        message.channel.send(embed);
        break;
      case "greeting":
        message.channel.send(greeting(author));
        break;
      case "urban":
        if (!args.length) {
          return message.channel.send("You need to supply a search term!");
        }

        query = stringify({ term: args.join(" ") });

        const { list } = await fetch(
          `https://api.urbandictionary.com/v0/define?${query}`
        ).then(response => response.json());

        if (!list.length) {
          return message.channel.send(
            `No results found for **${args.join(" ")}**.`
          );
        }

        const [answer] = list;

        embed = new RichEmbed()
          .setColor("#EFFF00")
          .setTitle(answer.word)
          .setURL(answer.permalink)
          .addField("Definition", trim(answer.definition, 1024))
          .addField("Example", trim(answer.example, 1024))
          .addField(
            "Rating",
            `${answer.thumbs_up} thumbs up. ${answer.thumbs_down} thumbs down.`
          );

        message.channel.send(embed);
        break;
      // default:
      //   debug.error(`${command} does not registered as command list`);
      //   break;
    }
  } catch (err) {
    debug.error(err);
  }
});
client.login(process.env.token);
