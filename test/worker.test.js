import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { bisikan } from "../response/index.js";
import { DAILY_CHECKS } from "../src/intent.js";

// Stub the Cloudflare runtime import so Node can load the Worker.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        url: "data:text/javascript,export class DurableObject {}",
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});
const { default: worker, Gateway } = await import("../src/worker.js");
hooks.deregister();

function makeGateway(ai) {
  const records = new Map();
  let alarm = null;
  let initialized;
  const storage = {
    get: async (key) => records.get(key),
    put: async (key, value) => records.set(key, value),
    delete: async (key) => records.delete(key),
    getAlarm: async () => alarm,
    setAlarm: async (time) => { alarm = time; },
  };
  const ctx = {
    storage,
    blockConcurrencyWhile(callback) { initialized = callback(); },
  };
  const env = { AI: ai };
  const gateway = new Gateway(ctx, env);
  // The runtime normally assigns these on the Durable Object base class.
  Object.assign(gateway, { ctx, env });
  return initialized.then(() => gateway);
}

test("the health endpoint starts the alarm and returns 503 until the gateway is ready", async () => {
  const gateway = await makeGateway();
  const env = { GATEWAY: { getByName: () => gateway } };
  const request = new Request("https://example.test/health");

  const unavailable = await worker.fetch(request, env);
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get("Cache-Control"), "no-store");
  assert.equal((await unavailable.json()).status, "unhealthy");
  const alarm = await gateway.ctx.storage.getAlarm();
  assert.equal(typeof alarm, "number");

  gateway.ready = true;
  const available = await worker.fetch(request, env);
  assert.equal(available.status, 200);
  assert.equal((await available.json()).botStatus, "connected");
  assert.equal(await gateway.ctx.storage.getAlarm(), alarm);
});

test("purchase replies use the current message and quoted reply when history fails", async (t) => {
  const run = t.mock.fn(async () => ({
    choices: [{ message: { content: "BELI" } }],
  }));
  const gateway = await makeGateway({ run });
  gateway.discord = t.mock.fn(async (_path, body) => {
    if (!body) throw new Error("History request failed");
  });

  await gateway.onMessage({
    id: "2",
    channel_id: "10",
    content: "jadi beli ga ya",
    mentions: [],
    author: { username: "andi" },
    referenced_message: { id: "1", content: "keyboard lagi diskon", author: { username: "budi" } },
  });

  assert.equal(run.mock.callCount(), 1);
  assert.equal(
    run.mock.calls[0].arguments[1].messages[1].content,
    "Earlier messages:\nbudi: keyboard lagi diskon\n\nLatest message:\nandi: jadi beli ga ya",
  );
  assert.equal(gateway.discord.mock.callCount(), 2);
  const [path, reply] = gateway.discord.mock.calls[1].arguments;
  assert.equal(path, "/channels/10/messages");
  assert.ok(bisikan.includes(reply.content));
  assert.equal((await gateway.ctx.storage.get("aiUsage")).count, 1);
});

test("an exhausted AI budget skips both the Discord history request and classifier", async (t) => {
  const run = t.mock.fn();
  const gateway = await makeGateway({ run });
  gateway.discord = t.mock.fn();
  await gateway.ctx.storage.put("aiUsage", {
    day: new Date().toISOString().slice(0, 10),
    count: DAILY_CHECKS,
  });

  assert.equal(await gateway.checkPurchase({ id: "2", channel_id: "10" }), null);
  assert.equal(gateway.discord.mock.callCount(), 0);
  assert.equal(run.mock.callCount(), 0);
});

const guildMessage = (channel, content, mentions = []) => ({
  guild_id: "10",
  channel_id: channel,
  content,
  author: { id: "1", username: "andi" },
  mentions,
});

const interaction = (name, options = [], permissions = "32") => ({
  id: "3",
  token: "test-token",
  guild_id: "10",
  member: { permissions },
  data: { name, options },
});

test("guild channel settings gate automatic replies while mentions and slash commands still work", async (t) => {
  const gateway = await makeGateway();
  gateway.userId = "bot";
  gateway.discord = t.mock.fn();
  const configure = (action, channel, permissions) => gateway.onInteraction(interaction(
    "bisikan-config",
    [{ name: action, options: channel ? [{ name: "channel", value: channel }] : [] }],
    permissions,
  ));

  await configure("off", null, "0");
  assert.match(gateway.discord.mock.calls[0].arguments[1].data.content, /Manage Server/);
  await gateway.onMessage(guildMessage("100", "beli"));
  assert.equal(gateway.discord.mock.calls[1].arguments[0], "/channels/100/messages");

  await configure("allow", "101");
  gateway.discord.mock.resetCalls();
  await gateway.onMessage(guildMessage("102", "mau checkout keyboard ini"));
  await gateway.onMessage(guildMessage("101", "beli"));
  assert.equal(gateway.discord.mock.callCount(), 1);
  assert.equal(gateway.discord.mock.calls[0].arguments[0], "/channels/101/messages");

  await configure("remove", "101");
  gateway.discord.mock.resetCalls();
  await gateway.onMessage(guildMessage("102", "beli"));
  assert.equal(gateway.discord.mock.callCount(), 0);
  await gateway.onMessage(guildMessage("102", "<@bot>", [{ id: "bot" }]));
  await gateway.onInteraction(interaction("bisikan", [], "0"));
  assert.equal(gateway.discord.mock.callCount(), 2);
  assert.ok(bisikan.includes(gateway.discord.mock.calls[1].arguments[1].data.content));

  await configure("all");
  await gateway.onMessage(guildMessage("102", "beli"));
  assert.equal(gateway.discord.mock.calls.at(-1).arguments[0], "/channels/102/messages");
});

test("automatic replies reserve the channel during delivery and cool down for 30 seconds", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-20T00:00:00Z") });
  const gateway = await makeGateway();
  const delivery = Promise.withResolvers();
  const started = Promise.withResolvers();
  gateway.discord = t.mock.fn(() => {
    started.resolve();
    return delivery.promise;
  });
  const message = guildMessage("100", "beli");

  const first = gateway.onMessage(message);
  await started.promise;
  await gateway.onMessage(message);
  assert.equal(gateway.discord.mock.callCount(), 1);

  delivery.resolve();
  await first;
  t.mock.timers.tick(29_999);
  await gateway.onMessage(message);
  assert.equal(gateway.discord.mock.callCount(), 1);

  t.mock.timers.tick(1);
  await gateway.onMessage(message);
  assert.equal(gateway.discord.mock.callCount(), 2);
});
