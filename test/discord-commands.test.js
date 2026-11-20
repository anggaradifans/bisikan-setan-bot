import assert from "node:assert/strict";
import { createHash, timingSafeEqual } from "node:crypto";
import test from "node:test";
import { handleCommandRegistration } from "../src/discord-commands.js";

test("command registration requires the key and always targets the configured guild", async (t) => {
  const key = "a".repeat(43);
  const env = {
    DISCORD_APPLICATION_ID: "100000000000000001",
    DISCORD_GUILD_ID: "100000000000000002",
    DISCORD_COMMAND_REGISTRATION_KEY_HASH: createHash("sha256").update(key).digest("hex"),
    token: "test-token",
  };
  // Cloudflare's Web Crypto extension is unavailable in Node.
  Object.defineProperty(crypto.subtle, "timingSafeEqual", {
    value: timingSafeEqual, configurable: true,
  });
  t.after(() => { delete crypto.subtle.timingSafeEqual; });
  const discord = t.mock.method(globalThis, "fetch", async () =>
    Response.json([{ name: "ping" }, { name: "bisikan" }, { name: "bisikan-config" }]));
  const url = "https://example.test/admin/discord-commands";
  const post = (bearer) => new Request(url + "?guild=100000000000000003", {
    method: "POST",
    headers: { Authorization: `Bearer ${bearer}` },
  });

  assert.equal((await handleCommandRegistration(post(key), {})).status, 404);
  assert.equal((await handleCommandRegistration(new Request(url), env)).status, 405);
  assert.equal((await handleCommandRegistration(post("b".repeat(43)), env)).status, 401);
  assert.equal(discord.mock.callCount(), 0);

  const response = await handleCommandRegistration(post(key), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { registered: 3 });
  assert.equal(discord.mock.callCount(), 1);
  const [target, request] = discord.mock.calls[0].arguments;
  assert.equal(target, "https://discord.com/api/v10/applications/100000000000000001/guilds/100000000000000002/commands");
  assert.equal(request.method, "PUT");
  assert.equal(request.headers.Authorization, "Bot test-token");
  assert.deepEqual(JSON.parse(request.body).map(({ name }) => name), ["ping", "bisikan", "bisikan-config"]);
});
