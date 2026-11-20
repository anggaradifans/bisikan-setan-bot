// Runs the labelled chats in intent-cases.js through the real Workers AI model.
// Usage: npm run eval [-- <model>]. Uses your `wrangler login` and free neurons.
import { getPlatformProxy } from "wrangler";
import { MODEL, classifyPurchase } from "../src/intent.js";
import { replyTo } from "../src/reply.js";
import cases from "./intent-cases.js";

const model = process.argv[2] ?? MODEL;
const start = Date.parse("2026-01-01T12:00:00Z");

// Builds a gateway-style message and the Discord history before it (newest first).
function toMessages(chat) {
  const messages = chat.map((entry, i) => {
    const [username, content] = Array.isArray(entry) ? entry : ["andi", entry];
    return {
      id: String(i + 1),
      content,
      author: { id: username, username },
      mentions: [],
      timestamp: new Date(start + i * 60_000).toISOString(),
    };
  });
  return { message: messages.pop(), history: messages.reverse() };
}

const { env, dispose } = await getPlatformProxy();
let correct = 0;
let falseReplies = 0;
let modelChecks = 0;
let modelFailures = 0;
let routingFailures = 0;
let neurons = 0;
try {
  console.log(`Model: ${model}\n`);
  for (const { expected, skipAI = false, chat } of cases) {
    const text = chat.map((entry) => (Array.isArray(entry) ? entry.join(": ") : entry)).join(" / ");
    const { message, history } = toMessages(chat);
    let result;
    const reply = await replyTo(message, "bot", async () => {
      modelChecks++;
      result = await classifyPurchase({ ai: env.AI, message, history, model });
      neurons += result.neurons ?? 0;
      return result.intent;
    });
    if (Boolean(result) === skipAI) {
      routingFailures++;
      console.log(`✗ unexpected classifier routing: ${text}`);
      continue;
    }
    if (result && !result.intent) {
      modelFailures++;
      console.log(`✗ no usable model answer (${result.error ?? JSON.stringify(result.answer)}): ${text}`);
      continue;
    }
    const got = reply ? result?.intent ?? "BELI" : "TIDAK";
    if (got === expected) {
      correct++;
      continue;
    }
    if (expected === "TIDAK") falseReplies++;
    console.log(`✗ expected ${expected}, got ${got}: ${text}`);
  }
  console.log(`\n${correct}/${cases.length} correct, ${falseReplies} replies that should have been silent`);
  console.log(`${modelFailures} model failures, ${routingFailures} routing failures`);
  console.log(`${modelChecks ? (neurons / modelChecks).toFixed(1) : "0"} neurons per model check`);
  if (correct !== cases.length) process.exitCode = 1;
} finally {
  await dispose();
}
