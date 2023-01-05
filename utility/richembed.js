import { RichEmbed } from  "discord.js"
import { embed } from "../response"

export function richEmbed(command){
    return embed[command]
}