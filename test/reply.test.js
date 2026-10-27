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

test("a mention gets a bisikan", () => {
  const reply = replyTo(message("<@999> gimana?", [{ id: BOT_ID }]), BOT_ID);
  assert.ok(bisikan.includes(reply.content));
});

test("'nanti beli' gets the weak-mindset speech", () => {
  assert.deepEqual(replyTo(message("Ntar aja belinya"), BOT_ID), { content: nantiAjaBelinya });
});

test("a trigger word gets a bisikan", () => {
  assert.ok(bisikan.includes(replyTo(message("Mau BELI keyboard"), BOT_ID).content));
});

test("embed commands are case-insensitive", () => {
  assert.deepEqual(replyTo(message("!responseID"), BOT_ID), { embeds: [embed.responseid] });
  assert.deepEqual(replyTo(message("!rules"), BOT_ID), { embeds: [embed.rules] });
});

test("!greeting greets the author", () => {
  assert.match(replyTo(message("!greeting"), BOT_ID).content, /^Good (morning|day|evening), <@123>$/);
});

test("other messages get no reply", () => {
  assert.equal(replyTo(message("halo semua"), BOT_ID), null);
  assert.equal(replyTo(message("!unknown"), BOT_ID), null);
  assert.equal(replyTo(message("hey <@555>", [{ id: "555" }]), BOT_ID), null);
});
