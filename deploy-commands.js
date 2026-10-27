import dotenv from 'dotenv';
import commands from './commands/index.js';

dotenv.config({ quiet: true });

// Fully refreshes the guild's slash commands with the current set.
const response = await fetch(
	`https://discord.com/api/v10/applications/${process.env.uid}/guilds/${process.env.guild}/commands`,
	{
		method: 'PUT',
		headers: {
			Authorization: `Bot ${process.env.token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(commands.map((command) => command.data)),
	},
);

if (response.ok) {
	const data = await response.json();
	console.log(`Successfully reloaded ${data.length} application (/) commands.`);
} else {
	console.error(`Failed to reload commands: ${response.status} ${await response.text()}`);
	process.exitCode = 1;
}
