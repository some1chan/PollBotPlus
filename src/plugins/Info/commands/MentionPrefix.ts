import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	DiscordMessage,
	Logger,
} from "@framedjs/core";
import { oneLine } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "",
			about: oneLine`A command that runs if a valid
			prefix is found, but there's no command.`,
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (
			msg instanceof DiscordMessage &&
			msg.discord.msg &&
			msg.prefix != undefined
		) {
			// Gathers all prefixes that should trigger the help command
			const whitelistPrefixes = [...msg.client.commands.defaultPrefixes];
			if (msg.discord.guild && msg.content.includes("<@&")) {
				try {
					await msg.discord.guild.roles.fetch();
					const botRolePrefix = msg.client.commands.getBotRolePrefix(
						msg.discord.guild
					);
					if (botRolePrefix) {
						whitelistPrefixes.push(botRolePrefix);
					}
				} catch (error) {
					Logger.error(error.stack);
				}
			}

			// If the message's prefix isn't included in the list, ignore
			if (!whitelistPrefixes.includes(msg.prefix)) {
				return false;
			}

			try {
				const command = msg.client.commands.getCommand("help");

				if (!command) {
					return false;
				}

				if (
					await msg.client.commands.checkForPermissions(msg, command)
				) {
					await command.run(msg);
				}
			} catch (error) {
				Logger.error(error.stack);
			}
		}
		return false;
	}
}
