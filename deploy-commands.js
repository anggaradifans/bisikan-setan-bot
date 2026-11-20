import dotenv from 'dotenv';
import { registerGuildCommands } from './src/discord-commands.js';

dotenv.config({ quiet: true });

const { uid, guild, token } = process.env;
if (!/^\d{17,20}$/.test(uid ?? "") || !/^\d{17,20}$/.test(guild ?? "") || !token?.trim()) {
	console.error("Set a valid Discord application ID (uid), server ID (guild), and bot token (token).");
	process.exit(1);
}

// Fully refreshes the guild's slash commands with the current set.
const response = await registerGuildCommands(uid, guild, token);

if (response.ok) {
	const data = await response.json();
	console.log(`Successfully reloaded ${data.length} application (/) commands.`);
} else {
	console.error(`Failed to reload commands: ${response.status} ${await response.text()}`);
	process.exitCode = 1;
}
