import { bisikan, embed, greeting, nantiAjaBelinya } from "../response/index.js";
import { isCandidate } from "./intent.js";

const prefix = "!";

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Builds the reply body for a gateway MESSAGE_CREATE payload, or null to stay quiet.
// `classify` asks the AI about a purchase and resolves to "BELI", "TUNDA" or anything else.
export async function replyTo(message, botUserId, classify) {
  const content = message.content.toLowerCase();

  if (message.mentions.some((user) => user.id === botUserId)) {
    return { content: pick(bisikan) };
  }

  if (content.startsWith(prefix)) {
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

  if (!isCandidate(content)) return null;
  const intent = await classify();
  if (intent === "BELI") return { content: pick(bisikan) };
  if (intent === "TUNDA") return { content: nantiAjaBelinya };
  return null;
}
