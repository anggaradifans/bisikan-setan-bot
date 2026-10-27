import { bisikan, embed, greeting, nantiAjaBelinya, trigger } from "../response/index.js";

const prefix = "!";

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Builds the reply body for a gateway MESSAGE_CREATE payload, or null to stay quiet.
export function replyTo(message, botUserId) {
  const content = message.content.toLowerCase();

  if (message.mentions.some((user) => user.id === botUserId)) {
    return { content: pick(bisikan) };
  }
  if (
    (content.includes("nanti") || content.includes("ntar")) &&
    content.includes("beli")
  ) {
    return { content: nantiAjaBelinya };
  }
  if (trigger.some((word) => content.includes(word))) {
    return { content: pick(bisikan) };
  }

  if (!content.startsWith(prefix)) return null;

  const args = message.content.slice(prefix.length).split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (["responseid", "responseen", "rules"].includes(command)) {
    return { embeds: [embed[command]] };
  }
  if (command === "greeting") {
    return { content: greeting(`<@${message.author.id}>`) };
  }
  return null;
}
