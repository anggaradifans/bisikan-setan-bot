import { EmbedBuilder } from "discord.js";
import { embed } from "../response/index.js";

export function richEmbed(command){
    return embed[command]
}