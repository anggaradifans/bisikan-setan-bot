import assert from "node:assert/strict";
import test from "node:test";
import {
  DAILY_CHECKS,
  MODEL,
  buildConversation,
  classifyPurchase,
  isCandidate,
  parseLabel,
  takeDailyCheck,
} from "../src/intent.js";

const NOW = Date.parse("2026-10-28T12:00:00Z");
const msg = (id, content, minutesAgo = 0, author = {}) => ({
  id: String(id),
  content,
  author: { id: "1", username: "andi", ...author },
  timestamp: new Date(NOW - minutesAgo * 60_000).toISOString(),
});

// An AI binding that answers `answer` (or throws it) and records the request.
const fakeAi = (answer) => ({
  async run(model, input) {
    this.request = { model, input };
    if (answer instanceof Error) throw answer;
    return { choices: [{ message: { content: answer } }], usage: { neurons: 2 } };
  },
});

test("only messages containing 'beli' are candidates", () => {
  assert.ok(isCandidate("Mau BELI keyboard"));
  assert.ok(isCandidate("ntar aja belinya"));
  assert.ok(!isCandidate("halo semua"));
});

test("the conversation keeps the latest 8 human messages from the last 30 minutes, oldest first", () => {
  const history = [
    msg(20, "bot reply", 1, { bot: true, username: "bisikan" }),
    msg(19, "", 1), // attachment only
    ...Array.from({ length: 10 }, (_, i) => msg(18 - i, `pesan ${18 - i}`, 2 + i)),
    msg(5, "kemarin sore", 45),
  ].sort((a, b) => b.id - a.id);
  const { text, contextCount } = buildConversation(msg(21, "jadi beli ga ya"), history);

  assert.equal(contextCount, 8);
  assert.equal(
    text,
    [
      "Earlier messages:",
      ...Array.from({ length: 8 }, (_, i) => `andi: pesan ${11 + i}`),
      "",
      "Latest message:",
      "andi: jadi beli ga ya",
    ].join("\n")
  );
});

test("long messages are trimmed", () => {
  const { text } = buildConversation(msg(2, "beli?"), [msg(1, "a".repeat(500), 1)]);
  assert.ok(text.includes(`andi: ${"a".repeat(297)}...\n`));
});

test("the message being replied to is included even when old or from a bot", () => {
  const original = msg(1, "Ya beli lah", 120, { bot: true, username: "bisikan" });
  const { text, contextCount } = buildConversation({ ...msg(3, "oke deh gw beli"), referenced_message: original }, [
    msg(2, "wkwk", 1),
  ]);
  assert.equal(contextCount, 2);
  assert.match(text, /^Earlier messages:\nbisikan: Ya beli lah\nandi: wkwk\n/);

  const inHistory = buildConversation({ ...msg(3, "beli"), referenced_message: msg(2, "wkwk", 1) }, [msg(2, "wkwk", 1)]);
  assert.equal(inHistory.contextCount, 1);
});

test("without history only the latest message is sent", () => {
  assert.deepEqual(buildConversation(msg(1, "beli ga nih"), []), {
    text: "Latest message:\nandi: beli ga nih",
    contextCount: 0,
  });
});

test("only an exact label counts as an answer", () => {
  assert.equal(parseLabel("BELI"), "BELI");
  assert.equal(parseLabel(" tunda.\n"), "TUNDA");
  assert.equal(parseLabel("**TIDAK**"), "TIDAK");
  for (const answer of ["BELI karena dia mau", "MAYBE", "", null, undefined]) {
    assert.equal(parseLabel(answer), null);
  }
});

test("the daily cap counts checks per UTC day", () => {
  const day = new Date("2026-10-28T23:59:00Z");
  assert.deepEqual(takeDailyCheck(undefined, day), { day: "2026-10-28", count: 1 });
  assert.deepEqual(takeDailyCheck({ day: "2026-10-28", count: DAILY_CHECKS - 1 }, day), {
    day: "2026-10-28",
    count: DAILY_CHECKS,
  });
  assert.equal(takeDailyCheck({ day: "2026-10-28", count: DAILY_CHECKS }, day), null);
  assert.deepEqual(takeDailyCheck({ day: "2026-10-27", count: DAILY_CHECKS }, day), { day: "2026-10-28", count: 1 });
});

test("classifyPurchase asks the model about the conversation", async () => {
  const ai = fakeAi("BELI");
  const result = await classifyPurchase({ ai, message: msg(2, "beli ga ya"), history: [msg(1, "diskon nih", 1)] });

  assert.deepEqual(result, { intent: "BELI", answer: "BELI", contextCount: 1, neurons: 2 });
  assert.equal(ai.request.model, MODEL);
  const [system, user] = ai.request.input.messages;
  assert.equal(system.role, "system");
  assert.equal(user.content, "Earlier messages:\nandi: diskon nih\n\nLatest message:\nandi: beli ga ya");
});

test("classifyPurchase fails closed on unclear answers and AI errors", async () => {
  const message = msg(1, "beli");
  for (const answer of ["", "BELI karena dia mau"]) {
    assert.equal((await classifyPurchase({ ai: fakeAi(answer), message, history: [] })).intent, null);
  }
  for (const error of [
    new Error("3036: You have used up your daily free allocation of 10,000 neurons."),
    new Error("3040: Capacity temporarily exceeded, please try again."),
    new TypeError("fetch failed"),
  ]) {
    const result = await classifyPurchase({ ai: fakeAi(error), message, history: [] });
    assert.equal(result.intent, null);
    assert.equal(result.error, error.message);
  }
});
