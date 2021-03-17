/* eslint-disable no-mixed-spaces-and-tabs */
import {
	BaseMessage,
	BasePlugin,
	BaseCommand,
	Discord,
	DiscordUtils,
	Logger,
	EmbedHelper,
} from "@framedjs/core";
import { oneLine, stripIndent } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "render",
			aliases: ["renderembed"],
			about: "Creates an embed from a Discohook URL or JSON.",
			description: stripIndent`
			Creates an embed from Discohook JSON or URL. 
			${oneLine`To get JSON from Discohook, click JSON Editor > Copy to Clipboard.
			For a URL you can use the built-in Discohook "Share Message" URL, or any other shortened URL.`}
			`,
			usage: "<json|link> [channel|message link]",
			examples: stripIndent`
			\`{{prefix}}{{id}} { "content": "Hello!" }\`
			\`{{prefix}}{{id}} https://is.gd/ZJGQnw\`
			\`{{prefix}}{{id}} https://share.discohook.app/go/xxxxxxxx\`
			\`{{prefix}}{{id}} { "content": "Hello!" } #bot-commands\`			
			`,
			userPermissions: {
				botOwnersOnly: true,
				checkAutomatically: false,
			},
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		// Manually checks user permission to stay silent
		const permsResult = this.checkUserPermissions(
			msg,
			this.userPermissions
		);
		if (!permsResult.success) {
			Logger.warn(
				`${this.id} called by user without permission (${msg.discord?.author.id})`
			);
			return false;
		}

		if (msg.discord && msg.args && msg.command) {
			let newContents = msg.getArgsContent();

			if (newContents.trim().length == 0) {
				await msg.sendHelpForCommand();
				return false;
			}

			let notUrl = false;

			// Parses the codeblock characters out if they exist
			const firstThreeCharacters = newContents.substring(0, 3);
			const firstSixCharacters = newContents.substring(0, 6);
			const lastThreeCharacters = newContents.substring(
				newContents.length - 3,
				newContents.length
			);
			if (firstSixCharacters == "```json") {
				newContents = newContents.substring(7, newContents.length);
				notUrl = true;
			} else if (firstThreeCharacters == "```") {
				newContents = newContents.substring(3, newContents.length);
				notUrl = true;
			}
			if (lastThreeCharacters == "```") {
				newContents = newContents.substring(0, newContents.length - 3);
				notUrl = true;
			}

			let channelOrMessage:
				| Discord.TextChannel
				| Discord.DMChannel
				| Discord.NewsChannel
				| Discord.Message
				| undefined;

			if (!notUrl) {
				const args = BaseMessage.getArgs(newContents);
				try {
					if (args[1]) {
						try {
							if (msg.discord.guild?.channels) {
								const tempChannel = DiscordUtils.resolveGuildChannel(
									args[1],
									msg.discord.guild?.channels
								);

								if (tempChannel && tempChannel.isText()) {
									newContents = args[0];
									channelOrMessage = tempChannel;
								} else {
									throw new Error();
								}
							}
						} catch (error) {
							if (msg.discord.guild) {
								const tempMsg = await DiscordUtils.getMessageFromLink(
									args[1],
									msg.discord.client,
									msg.discord.guild
								);

								if (tempMsg) {
									newContents = args[0];
									channelOrMessage = tempMsg;
								}
							}
						}
					}
				} catch (error) {
					Logger.error(error);
				}
			}

			let useDefaultChannel = false;
			if (!channelOrMessage) {
				channelOrMessage = msg.discord.channel;
				useDefaultChannel = true;
			}

			// Gets and renders the data
			const newData = await DiscordUtils.getOutputData(newContents);
			const messages = await DiscordUtils.renderOutputData(
				newData,
				channelOrMessage,
				msg.client
			);

			if (!useDefaultChannel) {
				const embed = EmbedHelper.getTemplate(
					msg.discord,
					await EmbedHelper.getCheckOutFooter(msg, this.id)
				)
					.setTitle("Sent Message(s)")
					.setDescription(
						`Your new message(s) can be found **[here](${messages[0].url})**.`
					);
				await msg.discord.channel.send(embed);
			}

			return true;
		}

		return false;
	}
}
