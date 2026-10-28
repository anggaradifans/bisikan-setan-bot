import { DurableObject } from "cloudflare:workers";
import commands from "../commands/index.js";
import { HISTORY_LIMIT, classifyPurchase, takeDailyCheck } from "./intent.js";
import { replyTo } from "./reply.js";

const API_URL = "https://discord.com/api/v10";
const GATEWAY_URL = "https://gateway.discord.gg";
const USER_AGENT = "DiscordBot (https://github.com/anggaradifans/bisikan-setan-bot, 1.0.0)";

// GUILDS | GUILD_MESSAGES | MESSAGE_CONTENT
const INTENTS = (1 << 0) | (1 << 9) | (1 << 15);

const WATCHDOG_MS = 60_000;
// Discord allows 1000 identifies a day; one per 2 minutes stays well under it.
const IDENTIFY_GAP_MS = 2 * 60_000;
const FATAL_RETRY_MS = 60 * 60_000;
// Close codes a reconnect can't fix: bad token, sharding, API version or intents.
const FATAL_CLOSE_CODES = [4004, 4010, 4011, 4012, 4013, 4014];
// Close codes after which the session can't be resumed.
const STALE_SESSION_CLOSE_CODES = [4007, 4009];

const Op = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  RESUME: 6,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
};

/**
 * Holds the bot's Discord gateway connection. A Worker can't keep a socket
 * open between requests, so this single Durable Object does. The alarm sends
 * heartbeats; when Cloudflare restarts the object, the next alarm reconnects
 * and resumes the session so Discord replays the events that were missed.
 */
export class Gateway extends DurableObject {
  ws = null;
  ready = false;
  acked = true;
  heartbeatInterval = 41_250;
  session = null; // { id, resumeUrl, seq }, mirrored in storage
  userId = null;

  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.session = (await ctx.storage.get("session")) ?? null;
      this.userId = (await ctx.storage.get("userId")) ?? null;
    });
  }

  // Starts the alarm chain after the first deploy, or restarts it if it ever stopped.
  async start() {
    if ((await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(Date.now());
    }
  }

  async status() {
    return {
      status: "healthy",
      botStatus: this.ready ? "connected" : "disconnected",
      lastError: (await this.ctx.storage.get("lastError")) ?? null,
      timestamp: new Date().toISOString(),
    };
  }

  async alarm() {
    try {
      if (!this.ws) return await this.connect();
      if (!this.acked) {
        console.warn("Heartbeat was not acknowledged; reconnecting.");
        this.disconnect();
        return await this.connect();
      }
      this.acked = false;
      this.send({ op: Op.HEARTBEAT, d: this.session?.seq ?? null });
      await this.ctx.storage.setAlarm(Date.now() + this.heartbeatInterval);
    } catch (error) {
      console.error("Gateway alarm failed:", error);
      await this.ctx.storage.put("lastError", String(error));
      await this.ctx.storage.setAlarm(Date.now() + WATCHDOG_MS);
    }
  }

  async connect() {
    if (!this.env.token) {
      throw new Error("Missing required secret: token");
    }

    const blockedUntil = (await this.ctx.storage.get("blockedUntil")) ?? 0;
    const lastIdentifyAt = (await this.ctx.storage.get("lastIdentifyAt")) ?? 0;
    const retryAt = Math.max(blockedUntil, this.session ? 0 : lastIdentifyAt + IDENTIFY_GAP_MS);
    if (retryAt > Date.now()) {
      await this.ctx.storage.setAlarm(retryAt);
      return;
    }

    const base = this.session?.resumeUrl ?? GATEWAY_URL;
    const response = await fetch(`${base}/?v=10&encoding=json`, {
      headers: { Upgrade: "websocket" },
    });
    const ws = response.webSocket;
    if (!ws) {
      throw new Error(`Gateway refused the WebSocket upgrade: ${response.status}`);
    }
    ws.accept();
    ws.addEventListener("message", (event) => {
      this.onPayload(ws, event.data).catch((error) => {
        console.error("Gateway event failed:", error);
      });
    });
    ws.addEventListener("close", (event) => {
      this.onClose(ws, event).catch((error) => {
        console.error("Gateway close handling failed:", error);
      });
    });
    this.ws = ws;
    this.acked = true;
    // HELLO replaces this with the first heartbeat.
    await this.ctx.storage.setAlarm(Date.now() + WATCHDOG_MS);
  }

  disconnect() {
    const ws = this.ws;
    this.ws = null;
    this.ready = false;
    try {
      // Any code other than 1000/1001 keeps the session resumable.
      ws?.close(4000, "reconnecting");
    } catch {
      // Already closed.
    }
  }

  async reconnectSoon() {
    this.disconnect();
    // Discord asks clients to wait 1-5 seconds before reconnecting.
    await this.ctx.storage.setAlarm(Date.now() + 1000 + Math.random() * 4000);
  }

  async clearSession() {
    this.session = null;
    await this.ctx.storage.delete("session");
  }

  send(payload) {
    this.ws.send(JSON.stringify(payload));
  }

  async onPayload(ws, data) {
    if (ws !== this.ws) return;
    const { op, d, s, t } = JSON.parse(data);

    switch (op) {
      case Op.HELLO:
        this.heartbeatInterval = d.heartbeat_interval;
        await this.ctx.storage.setAlarm(Date.now() + d.heartbeat_interval * Math.random());
        return this.session ? this.resume() : this.identify();
      case Op.HEARTBEAT:
        return this.send({ op: Op.HEARTBEAT, d: this.session?.seq ?? null });
      case Op.HEARTBEAT_ACK:
        this.acked = true;
        return;
      case Op.RECONNECT:
        return this.reconnectSoon();
      case Op.INVALID_SESSION:
        if (!d) await this.clearSession();
        return this.reconnectSoon();
      case Op.DISPATCH:
        return this.onDispatch(t, d, s);
    }
  }

  async onClose(ws, { code, reason }) {
    if (ws !== this.ws) return;
    this.ws = null;
    this.ready = false;
    console.warn(`Gateway closed: ${code} ${reason}`);

    if (FATAL_CLOSE_CODES.includes(code)) {
      await this.ctx.storage.put({
        lastError: `Gateway closed with ${code}: ${reason}`,
        blockedUntil: Date.now() + FATAL_RETRY_MS,
      });
      await this.clearSession();
    } else if (STALE_SESSION_CLOSE_CODES.includes(code)) {
      await this.clearSession();
    }
    await this.ctx.storage.setAlarm(Date.now() + 1000 + Math.random() * 4000);
  }

  async identify() {
    await this.ctx.storage.put("lastIdentifyAt", Date.now());
    this.send({
      op: Op.IDENTIFY,
      d: {
        token: this.env.token,
        intents: INTENTS,
        properties: { os: "cloudflare", browser: "bisikan-setan-bot", device: "bisikan-setan-bot" },
      },
    });
  }

  resume() {
    this.send({
      op: Op.RESUME,
      d: { token: this.env.token, session_id: this.session.id, seq: this.session.seq },
    });
  }

  async onDispatch(t, d, s) {
    if (t === "READY") {
      this.session = {
        id: d.session_id,
        resumeUrl: d.resume_gateway_url.replace(/^wss:/, "https:"),
        seq: s,
      };
      this.userId = d.user.id;
      this.ready = true;
      await this.ctx.storage.put({ session: this.session, userId: this.userId });
      await this.ctx.storage.delete(["lastError", "blockedUntil"]);
      console.log(`Logged in as ${d.user.username}!`);
      return;
    }

    // Saved before handling, so a resume never replays an event we already answered.
    if (this.session) {
      this.session.seq = s;
      await this.ctx.storage.put("session", this.session);
    }

    if (t === "RESUMED") {
      this.ready = true;
      console.log("Gateway session resumed.");
    } else if (t === "MESSAGE_CREATE") {
      await this.onMessage(d);
    } else if (t === "INTERACTION_CREATE") {
      await this.onInteraction(d);
    }
  }

  async onMessage(message) {
    if (message.author.bot) return;
    const reply = await replyTo(message, this.userId, () => this.checkPurchase(message));
    if (reply) {
      await this.discord(`/channels/${message.channel_id}/messages`, reply);
    }
  }

  // Reads the channel's recent messages and asks Workers AI whether this one is
  // about buying something. Logs the outcome but never the conversation.
  async checkPurchase(message) {
    const log = (outcome) => console.log(`Purchase check ${message.id}: ${outcome}`);
    let history;
    try {
      history = await this.discord(
        `/channels/${message.channel_id}/messages?before=${message.id}&limit=${HISTORY_LIMIT}`
      );
    } catch (error) {
      log(`no history (${error.message.slice(0, 200)})`);
      return null;
    }

    const usage = takeDailyCheck(await this.ctx.storage.get("aiUsage"));
    if (!usage) {
      log("daily AI cap reached");
      return null;
    }
    await this.ctx.storage.put("aiUsage", usage);

    const { intent, contextCount, error } = await classifyPurchase({ ai: this.env.AI, message, history });
    log(`${intent ?? "no answer"}, ${contextCount} context messages${error ? `, ${error}` : ""}`);
    return intent;
  }

  async onInteraction(interaction) {
    const command = commands.find((cmd) => cmd.data.name === interaction.data?.name);
    if (!command) {
      console.warn(`No command matching ${interaction.data?.name} was found.`);
      return;
    }

    const reply = (data) =>
      this.discord(`/interactions/${interaction.id}/${interaction.token}/callback`, {
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: typeof data === "string" ? { content: data } : data,
      });

    try {
      await command.execute({ ...interaction, reply });
    } catch (error) {
      console.error(error);
      await reply({
        content: "There was an error while executing this command!",
        flags: 64, // EPHEMERAL
      });
    }
  }

  // POSTs `body` when given; otherwise GETs and returns the parsed response.
  async discord(path, body) {
    const response = await fetch(`${API_URL}${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bot ${this.env.token}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: body && JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Discord API returned ${response.status}: ${await response.text()}`);
    }
    if (!body) return response.json();
  }
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === "/health") {
      const gateway = env.GATEWAY.getByName("bot");
      await gateway.start();
      return Response.json(await gateway.status());
    }
    return new Response("Bisikan Setan Bot is running! 🤖");
  },
};
