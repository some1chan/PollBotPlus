import {
	BaseEvent,
	BaseMessage,
	BasePlugin,
	Discord,
	DiscordMessage,
	Logger,
} from "@framedjs/core";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "pollGuildCreate",
			discord: {
				name: "guildCreate",
			},
		});
	}

	async run(guild: Discord.Guild): Promise<void> {
		if (guild && guild.available) {
			for await (const channel of guild.channels.cache.values()) {
				if (
					channel.type === "text" &&
					channel instanceof Discord.TextChannel
				) {
					if (!guild.client.user) {
						try {
							throw new Error("Client user wasn't found");
						} catch (error) {
							Logger.error(error.stack);
						}
						return;
					}

					const permissions = channel.permissionsFor(
						guild.client.user
					);
					if (
						permissions?.has("VIEW_CHANNEL") == true &&
						permissions?.has("SEND_MESSAGES") == true
					) {
						const place = await BaseMessage.discordGetPlace(
							this.client,
							guild
						);

						const command = this.client.commands.getCommand(
							"help",
							place
						);

						if (command) {
							// Preparing message
							const msg = new DiscordMessage({
								client: this.client,
								content: await this.client.formatting.format(
									"$(command help)",
									place
								),
								discord: {
									client: guild.client,
									channel: channel,
									author: guild.client.user,
								},
							});
							await msg.getMessageElements(place);

							// Directly addressing the command allows us to bypass
							// the bot user execution check
							await command.run(msg);
						} else {
							Logger.error(
								"OnGuildCreate.ts: Command wasn't found!"
							);
						}

						break;
					}
				}
			}
		}
	}
}
