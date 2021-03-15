import {
	BaseEvent,
	BaseMessage,
	BasePlugin,
	Discord,
	DiscordMessage,
	Logger,
} from "@framedjs/core";
import { oneLine, stripIndents } from "common-tags";

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
		let validChannelsWithoutEmbed: (
			| Discord.TextChannel
			| Discord.NewsChannel
		)[] = [];

		if (!(guild && guild.available)) {
			return;
		}

		// Attempt to send to a channel with embed links
		for await (const channel of guild.channels.cache.values()) {
			if (
				channel instanceof Discord.TextChannel ||
				channel instanceof Discord.DMChannel
			) {
				if (!guild.client.user) {
					try {
						throw new Error("guild.client.user is undefined");
					} catch (error) {
						Logger.error(error);
					}
					return;
				}

				const permissions = channel.permissionsFor(guild.client.user);
				if (
					permissions?.has("VIEW_CHANNEL") == true &&
					permissions?.has("SEND_MESSAGES") == true
				) {
					if (!permissions.has("EMBED_LINKS")) {
						validChannelsWithoutEmbed.push(channel);
						continue;
					} else {
						await this.sendHelpMessage(
							guild,
							guild.client.user,
							channel
						);
						break;
					}
				}
			}
		}

		// It didn't send in a channel with embed links, so post a no embed version
		if (validChannelsWithoutEmbed[0]) {
			await this.sendHelpMessageNoEmbed(validChannelsWithoutEmbed[0]);
		}
	}

	async sendHelpMessageNoEmbed(
		channel: Discord.TextChannel | Discord.NewsChannel
	): Promise<void> {
		await channel.send(stripIndents`
		**Welcome to PollBotPlus!**
		PollBotPlus lets you to create polls on Discord quickly, easily, and beautifully.

		${oneLine`Unfortunately, I don't have permission to embed links,
		which this bot is dependent on for polls with custom options.
		Please give the bot permission to embed links!`}
		
		If you need any help doing this, you can join the support server here:
		https://discord.gg/RYbkcHfrnR
		`);
	}

	async sendHelpMessage(
		guild: Discord.Guild,
		user: Discord.ClientUser,
		channel: Discord.TextChannel | Discord.NewsChannel
	): Promise<void> {
		const place = await BaseMessage.discordGetPlace(this.client, guild);
		const command = this.client.commands.getCommand("help", place);

		if (!command) {
			Logger.error("OnGuildCreate.ts: Command wasn't found!");
			return;
		}

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
				author: user,
			},
		});
		await msg.getMessageElements(place);

		// Directly addressing the command allows us to bypass
		// the bot user execution check
		await command.run(msg);
	}
}
