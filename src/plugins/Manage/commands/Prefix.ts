import {
	BaseMessage,
	BasePlugin,
	BaseCommand,
	Logger,
	EmbedHelper,
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
			By changing the prefix, simple polls with the \`single\` option won't work.
			If those polls need to keep working, edit that message to use your new prefix.
			Embed polls aren't affected by prefix changes.
			`,
			inline: {
				usage: true,
				examples: true,
			},
			userPermissions: {
				checkAutomatically: false,
				discord: {
					permissions: ["MANAGE_GUILD"],
				},
			},
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg.args && msg.args[0]) {
			// Manual user permission check
			const permsResult = this.checkUserPermissions(
				msg,
				this.userPermissions
			);
			if (!permsResult.success) {
				await this.sendUserPermissionErrorMessage(
					msg,
					this.userPermissions,
					permsResult
				);
				return false;
			}

			if (msg.args[0].length > 24) {
				throw new FriendlyError(
					`The prefix specified is too long (>24 characters)!`
				);
			}

			const place = await msg.getPlace(true);
			if (place) {
				try {
					const a = await this.client.provider.prefixes.set(
						place.id,
						msg.args[0]
					);
					const newPrefix = this.client.provider.prefixes.get(
						place.id
					);

					switch (msg.platform) {
						case "discord":
							if (msg.discord) {
								const embed = EmbedHelper.getTemplate(
									msg.discord,
									await EmbedHelper.getCheckOutFooter(
										msg,
										this.id
									)
								)
									.setTitle("Changed Prefix")
									.setDescription(
										`The prefix was successfully changed to \`${newPrefix}\`.`
									);
								await msg.discord.channel.send(embed);
								break;
							}
						default:
							await msg.send(
								`Successfully changed the prefix to ${newPrefix}`
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
			await msg.sendHelpForCommand();
			return false;
		}
	}
}
