const { Client, RichEmbed } = require("discord.js");
const { bisikan } = require("./response");
const fetch = require("node-fetch");
const querystring = require("querystring");
require("dotenv").config();

const trim = (str, max) =>
  str.length > max ? `${str.slice(0, max - 3)}...` : str;

const client = new Client();
let index;
const prefix = "!";

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("message", async message => {
  try {
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
      case "rules":
        embed = new RichEmbed()
          .setColor("#F08080")
          .setTitle("BisikanSetanBot")
          .setThumbnail("https://i.imgur.com/wSTFkRM.png")
          .addField("Commands", "!beligakya \n !shouldibuythis")
          .addField("Beli", "Jangan ketik beli kalo gak mau disetanin");
        message.channel.send(embed);
        break;
      case "urban":
        if (!args.length) {
          return message.channel.send("You need to supply a search term!");
        }

        query = querystring.stringify({ term: args.join(" ") });

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
    }
  } catch (err) {
    console.log(err);
  }
});
client.login(process.env.token);
