import { embed, greeting, nantiAjaBelinya, randomBisikan } from "../response/index.js";
import { isCandidate } from "./intent.js";

const prefix = "!";

// Builds the reply body for a gateway MESSAGE_CREATE payload, or null to stay quiet.
export async function replyTo(message, botUserId, classify, allowAutomatic = () => true) {
  const content = message.content.toLowerCase();

  if (message.mentions.some((user) => user.id === botUserId)) {
    return { content: randomBisikan() };
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

  if (!isCandidate(content) || !(await allowAutomatic())) return null;
  if (content.trim() === "beli") return { content: randomBisikan() };
  const intent = await classify();
  if (intent === "BELI") return { content: randomBisikan() };
  if (intent === "TUNDA") return { content: nantiAjaBelinya };
  return null;
}
