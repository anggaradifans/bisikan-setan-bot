// Runs the labelled chats in intent-cases.js through the real Workers AI model.
// Usage: npm run eval [-- <model>]. Uses your `wrangler login` and free neurons.
import { getPlatformProxy } from "wrangler";
import { MODEL, classifyPurchase } from "../src/intent.js";
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
      timestamp: new Date(start + i * 60_000).toISOString(),
    };
  });
  return { message: messages.pop(), history: messages.reverse() };
}

const { env, dispose } = await getPlatformProxy();
let correct = 0;
let falseReplies = 0;
let neurons = 0;
try {
  console.log(`Model: ${model}\n`);
  for (const { expected, chat } of cases) {
    const result = await classifyPurchase({ ai: env.AI, ...toMessages(chat), model });
    const { intent, answer, error } = result;
    neurons += result.neurons ?? 0;
    const got = intent ?? "TIDAK";
    if (got === expected) {
      correct++;
      continue;
    }
    if (expected === "TIDAK") falseReplies++;
    const text = chat.map((entry) => (Array.isArray(entry) ? entry.join(": ") : entry)).join(" / ");
    console.log(`✗ expected ${expected}, got ${intent ?? `nothing (${error ?? JSON.stringify(answer)})`}: ${text}`);
  }
  console.log(`\n${correct}/${cases.length} correct, ${falseReplies} replies that should have been silent`);
  console.log(`${(neurons / cases.length).toFixed(1)} neurons per check`);
} finally {
  await dispose();
}
