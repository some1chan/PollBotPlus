import {
	Message,
	BasePlugin,
	BaseCommand,
	Logger,
	EmbedHelper,
	PluginManager,
	FriendlyError,
} from "@framedjs/core";
import { oneLine, stripIndents } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "prefix",
			about: "Sets the prefix for the bot.",
			description: stripIndents`
			${oneLine`Sets the Discord server prefix for the bot.
			\`{{prefix}}\` is the current prefix.`}`,
			usage: "<prefix>",
			examples: stripIndents`
			\`{{prefix}}{{id}} !\`
			\`{{prefix}}{{id}} "pls "\`
			`,
			notes: oneLine`
			By changing the prefix, simple polls with the \`once\` option won't work.
			If those polls need to keep working, edit that message to use your new prefix.
			Embed polls aren't affected by prefix changes.
			`,
			inline: {
				usage: true,
				examples: true,
			},
			permissions: {
				discord: {
					permissions: ["MANAGE_GUILD"],
				},
			},
		});
	}

	async run(msg: Message): Promise<boolean> {
		const guildOrTwitchId = await msg.getGuildOrTwitchId(true);

		if (msg.args && msg.args[0]) {
			// Checks for permission
			if (!this.hasPermission(msg, this.permissions)) {
				this.sendPermissionErrorMessage(msg);
				return false;
			}

			if (msg.args[0].length > 24) {
				throw new FriendlyError(
					`The prefix specified is too long (>24 characters)!`
				);
			}

			if (guildOrTwitchId) {
				try {
					await this.client.setGuildOrTwitchIdPrefix(
						"default",
						guildOrTwitchId,
						msg.args[0]
					);
					switch (msg.platform) {
						case "discord":
							if (msg.discord) {
								const embed = EmbedHelper.getTemplate(
									msg.discord,
									this.client.helpCommands,
									this.id
								)
									.setTitle("Changed Prefix")
									.setDescription(
										`The prefix was successfully changed to \`${msg.args[0]}\`.`
									);
								await msg.discord.channel.send(embed);
								break;
							}
						default:
							msg.send(
								`Successfully changed the prefix to ${msg.args[0]}`
							);
							break;
					}
					return true;
				} catch (error) {
					Logger.error(error.stack);
					return false;
				}
			} else {
				if (msg.discord) {
					await msg.send("Couldn't find guild ID!");
				} else if (msg.twitch) {
					await msg.send("Couldn't find Twitch channel ID!");
				} else {
					await msg.send("An unknown error occured.");
				}
				return false;
			}
		} else {
			await PluginManager.sendHelpForCommand(msg, guildOrTwitchId);
			return false;
		}
	}
}
