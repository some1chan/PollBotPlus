import {
	BaseEvent,
	BasePlugin,
	Discord,
	Logger,
	Message,
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
						const command = this.client.plugins.getCommand(
							"help",
							Message.discordGetGuildOrTwitchId(
								this.client,
								guild
							)
						);

						if (command) {
							const guildOrTwitchId = Message.discordGetGuildOrTwitchId(
								this.client,
								guild
							);

							// Preparing message
							const msg = new Message({
								client: this.client,
								content: await this.client.formatting.format(
									"$(command help)",
									guildOrTwitchId
								),
								discord: {
									client: guild.client,
									channel: channel,
									author: guild.client.user,
								},
							});
							await msg.getMessageElements(guildOrTwitchId);

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
