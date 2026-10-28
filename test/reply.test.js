import assert from "node:assert/strict";
import test from "node:test";
import { bisikan, embed, nantiAjaBelinya } from "../response/index.js";
import { replyTo } from "../src/reply.js";

const BOT_ID = "999";
const message = (content, mentions = []) => ({
  content,
  mentions,
  author: { id: "123", username: "tester" },
});

// A classifier that answers `intent` and counts how often it was asked.
const classifier = (intent) => {
  const classify = async () => {
    classify.calls++;
    return intent;
  };
  classify.calls = 0;
  return classify;
};

test("a mention gets a bisikan without asking the AI", async () => {
  const classify = classifier("TIDAK");
  const reply = await replyTo(message("<@999> gimana?", [{ id: BOT_ID }]), BOT_ID, classify);
  assert.ok(bisikan.includes(reply.content));
  assert.equal(classify.calls, 0);
});

test("buying intent gets a bisikan", async () => {
  const reply = await replyTo(message("Mau BELI keyboard"), BOT_ID, classifier("BELI"));
  assert.ok(bisikan.includes(reply.content));
});

test("postponing gets the weak-mindset speech", async () => {
  assert.deepEqual(await replyTo(message("Ntar aja belinya"), BOT_ID, classifier("TUNDA")), {
    content: nantiAjaBelinya,
  });
});

// classifyPurchase turns AI errors and unclear answers into null; see intent.test.js.
test("no intent or no answer gets no reply", async () => {
  const anecdote = "Pas beli armor up jadi dragonia lord nya, dari yang runner dragonia lord dapet 2 lagi set wing";
  for (const intent of ["TIDAK", null]) {
    assert.equal(await replyTo(message(anecdote), BOT_ID, classifier(intent)), null);
  }
});

test("only messages with 'beli' are sent to the AI", async () => {
  const classify = classifier("BELI");
  assert.equal(await replyTo(message("halo semua"), BOT_ID, classify), null);
  assert.equal(await replyTo(message("hey <@555>", [{ id: "555" }]), BOT_ID, classify), null);
  assert.equal(classify.calls, 0);
});

test("embed commands are case-insensitive and skip the AI", async () => {
  const classify = classifier("BELI");
  assert.deepEqual(await replyTo(message("!responseID"), BOT_ID, classify), { embeds: [embed.responseid] });
  assert.deepEqual(await replyTo(message("!rules"), BOT_ID, classify), { embeds: [embed.rules] });
  assert.equal(await replyTo(message("!unknown beli"), BOT_ID, classify), null);
  assert.equal(classify.calls, 0);
});

test("!greeting greets the author", async () => {
  const reply = await replyTo(message("!greeting"), BOT_ID, classifier("BELI"));
  assert.match(reply.content, /^Good (morning|day|evening), <@123>$/);
});
