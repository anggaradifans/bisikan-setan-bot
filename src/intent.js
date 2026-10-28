import { trigger } from "../response/index.js";
import { trim } from "../utility/string.js";

export const MODEL = "@cf/google/gemma-4-26b-a4b-it";
// A check costs about 2 neurons on this model, and about 11 with a full context,
// so 800 a day stays under the 10,000 free neurons even on Workers Paid.
export const DAILY_CHECKS = 800;
// Fetched from Discord; bots and old messages are dropped from it.
export const HISTORY_LIMIT = 10;

const CONTEXT_MESSAGES = 8;
const CONTEXT_WINDOW_MS = 30 * 60_000;
const MAX_CHARS = 300;
const LABELS = ["BELI", "TUNDA", "TIDAK"];

const SYSTEM_PROMPT = `You read a casual Indonesian Discord chat. Decide whether the author of the LATEST message is, right now, thinking about buying something with real money.

Answer with exactly one word:
BELI - they want, are considering, or ask whether/what/where to buy something now. Buying a game, DLC or top-up with real money counts.
TUNDA - they want it but are postponing or holding back ("nanti aja", "nunggu gajian", "tahan dulu").
TIDAK - anything else: a purchase already made, a decision not to buy ("gak jadi beli"), someone else's purchase, items bought inside a game with game currency, "beli" inside another word (beliau, pembelian), jokes, or when unsure.

Earlier messages are context only; judge the latest message.

Examples:
"Pas beli armor up jadi dragonia lord nya, dari yang runner dragonia lord dapet 2 lagi set wing" -> TIDAK
"mau beli keyboard baru nih, worth it gak ya?" -> BELI
"pengen sih, tapi ntar aja deh belinya pas gajian" -> TUNDA`;

export const isCandidate = (content) =>
  trigger.some((word) => content.toLowerCase().includes(word));

const line = (message) => `${message.author.username}: ${trim(message.content, MAX_CHARS)}`;

// Turns the message and the channel history before it (newest first, as Discord
// returns it) into the text the model reads.
export function buildConversation(message, history) {
  const since = Date.parse(message.timestamp) - CONTEXT_WINDOW_MS;
  const context = history
    .filter((m) => !m.author.bot && m.content && Date.parse(m.timestamp) >= since)
    .slice(0, CONTEXT_MESSAGES)
    .reverse();

  // A reply's original message is context even when it's older or from a bot.
  const original = message.referenced_message;
  if (original?.content && !context.some((m) => m.id === original.id)) {
    context.unshift(original);
  }

  const latest = `Latest message:\n${line(message)}`;
  return {
    text: context.length ? `Earlier messages:\n${context.map(line).join("\n")}\n\n${latest}` : latest,
    contextCount: context.length,
  };
}

// Only an exact label counts; anything else means stay quiet.
export function parseLabel(answer) {
  if (typeof answer !== "string") return null;
  const word = answer.replace(/[^\p{L}]/gu, "").toUpperCase();
  return LABELS.includes(word) ? word : null;
}

// Returns the next usage record for storage, or null once today's checks are used up.
export function takeDailyCheck(usage, now = new Date()) {
  const day = now.toISOString().slice(0, 10); // The free allocation resets at 00:00 UTC.
  const count = usage?.day === day ? usage.count : 0;
  return count < DAILY_CHECKS ? { day, count: count + 1 } : null;
}

// Asks Workers AI whether the message is about buying something. Never throws:
// on any failure the intent is null, so the bot stays quiet.
export async function classifyPurchase({ ai, message, history, model = MODEL }) {
  const { text, contextCount } = buildConversation(message, history);
  try {
    const result = await ai.run(model, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0,
      max_completion_tokens: 5,
      // With thinking on, the reasoning uses up the tokens and the answer comes back empty.
      chat_template_kwargs: { enable_thinking: false },
    });
    const answer = result?.choices?.[0]?.message?.content;
    return { intent: parseLabel(answer), answer, contextCount, neurons: result?.usage?.neurons };
  } catch (error) {
    return { intent: null, error: String(error?.message ?? error).slice(0, 200), contextCount };
  }
}
