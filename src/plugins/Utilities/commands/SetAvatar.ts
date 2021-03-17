import {
	BaseMessage,
	BasePlugin,
	BaseCommand,
	EmbedHelper,
	Logger,
	DiscordMessage,
} from "@framedjs/core";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "setavatar",
			about: "Sets the bot's avatar.",
			usage: "<image URL>",
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


		if (msg instanceof DiscordMessage) {
			const argsContent = msg.getArgsContent();
			const attachment = msg.discord.msg?.attachments?.first();

			let url = "";
			if (attachment?.width) {
				url = attachment.url;
			} else if (argsContent.length != 0) {
				url = argsContent;
			} else {
				await msg.sendHelpForCommand();
				return false;
			}

			try {
				if (msg.discord) {
					await msg.discord.client.user?.setAvatar(url);

					const embed = EmbedHelper.getTemplate(
						msg.discord,
						await EmbedHelper.getCheckOutFooter(msg, this.id)
					)
						.setTitle("Changed Avatar")
						.setDescription(
							`The bot avatar has been changed to this image!`
						)
						.setThumbnail(url);
					await msg.discord.channel.send(embed);
					return true;
				}
			} catch (error) {
				Logger.error(error);
				throw new Error(error);
			}
		}

		return false;
	}
}
