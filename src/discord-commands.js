import commands from "../commands/index.js";

export function registerGuildCommands(applicationId, guildId, token) {
  return fetch(`https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands.map(({ data }) => data)),
    signal: AbortSignal.timeout(15_000),
  });
}

export async function handleCommandRegistration(request, env) {
  const headers = { "Cache-Control": "no-store" };
  const json = (body, status) => Response.json(body, { status, headers });
  const {
    DISCORD_APPLICATION_ID: applicationId,
    DISCORD_GUILD_ID: guildId,
    DISCORD_COMMAND_REGISTRATION_KEY_HASH: keyHash,
    token,
  } = env;
  const snowflake = /^\d{17,20}$/;
  if (!token || !snowflake.test(applicationId ?? "") || !snowflake.test(guildId ?? "") ||
      !/^[a-f0-9]{64}$/.test(keyHash ?? "")) {
    return json({ error: "Command registration is unavailable." }, 404);
  }
  if (request.method !== "POST") {
    return Response.json({ error: "Use POST." }, { status: 405, headers: { ...headers, Allow: "POST" } });
  }

  const key = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(request.headers.get("Authorization") ?? "")?.[1];
  if (!key) return json({ error: "Unauthorized." }, 401);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  if (!crypto.subtle.timingSafeEqual(digest, Uint8Array.fromHex(keyHash))) {
    return json({ error: "Unauthorized." }, 401);
  }

  try {
    const response = await registerGuildCommands(applicationId, guildId, token);
    if (!response.ok) {
      await response.body?.cancel();
      return json({ error: "Discord rejected command registration.", discordStatus: response.status }, 502);
    }
    return json({ registered: (await response.json()).length }, 200);
  } catch {
    return json({ error: "Could not register commands with Discord." }, 502);
  }
}
