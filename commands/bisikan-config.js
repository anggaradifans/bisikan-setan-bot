const MANAGE_GUILD = 1n << 5n;
const ADMINISTRATOR = 1n << 3n;
const SUB_COMMAND = 1;
const CHANNEL = 7;
const EPHEMERAL = 64;

export const allowlistKey = (guildId) => `automaticChannels:${guildId}`;

const channelOption = {
  type: CHANNEL,
  name: "channel",
  description: "Pilih channel.",
  required: true,
};

export default {
  data: {
    name: "bisikan-config",
    description: "Atur bisikan otomatis di server ini.",
    default_member_permissions: String(MANAGE_GUILD),
    options: [
      { type: SUB_COMMAND, name: "allow", description: "Izinkan bisikan otomatis di channel ini.", options: [channelOption] },
      { type: SUB_COMMAND, name: "remove", description: "Hapus channel dari daftar izin.", options: [channelOption] },
      { type: SUB_COMMAND, name: "all", description: "Izinkan bisikan otomatis di semua channel." },
      { type: SUB_COMMAND, name: "off", description: "Matikan semua bisikan otomatis." },
      { type: SUB_COMMAND, name: "status", description: "Lihat pengaturan bisikan otomatis." },
    ],
  },
  async execute(interaction, { storage }) {
    const reply = (content) => interaction.reply({ content, flags: EPHEMERAL });
    const permissions = BigInt(interaction.member?.permissions ?? "0");
    if (!interaction.guild_id || !(permissions & (MANAGE_GUILD | ADMINISTRATOR))) {
      return reply("Kamu perlu izin Manage Server untuk mengubah pengaturan ini.");
    }

    const key = allowlistKey(interaction.guild_id);
    const option = interaction.data.options?.[0];
    const channel = option?.options?.[0]?.value;
    switch (option?.name) {
      case "all":
        await storage.delete(key);
        return reply("Bisikan otomatis aktif di semua channel.");
      case "off":
        await storage.put(key, []);
        return reply("Bisikan otomatis dimatikan. Kamu masih bisa pakai /bisikan.");
      case "allow": {
        const channels = await storage.get(key);
        await storage.put(key, [...new Set([...(channels ?? []), channel])]);
        if (!channels) return reply(`Bisikan otomatis sekarang hanya aktif di <#${channel}>.`);
        return reply(`Bisikan otomatis diizinkan di <#${channel}>.`);
      }
      case "remove": {
        const channels = await storage.get(key);
        if (!channels) return reply("Semua channel diizinkan. Pakai /bisikan-config allow untuk mulai membuat daftar izin.");
        await storage.put(key, channels.filter((id) => id !== channel));
        return reply(`<#${channel}> dihapus dari daftar izin.`);
      }
      case "status": {
        const channels = await storage.get(key);
        if (!channels) return reply("Bisikan otomatis aktif di semua channel.");
        if (!channels.length) return reply("Bisikan otomatis dimatikan.");
        const shown = channels.slice(0, 50).map((id) => `<#${id}>`).join(", ");
        const remaining = channels.length - 50;
        return reply(remaining > 0 ? `Channel yang diizinkan: ${shown}, dan ${remaining} lainnya.` : `Channel yang diizinkan: ${shown}.`);
      }
      default:
        return reply("Pilih pengaturan bisikan otomatis.");
    }
  },
};
