import {
	BaseEvent,
	BasePlugin,
	Discord,
	Message,
	Logger,
} from "@framedjs/core";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "helpMessage",
			discord: {
				name: "message",
			},
		});
	}

	async run(msg: Discord.Message): Promise<void> {
		const content = msg.content.toLocaleLowerCase();
		if (
			content == `<@!${msg.client.user?.id}>` ||
			content == `<@${msg.client.user?.id}>`
		) {
			const commandId = "help";

			const guildOrTwitchId = Message.discordGetGuildOrTwitchId(
				this.client,
				msg.guild
			);
			const commandPrefix = this.plugin.commands
				.get(commandId)
				?.getDefaultPrefix(guildOrTwitchId);

			try {
				const newFramedMsg = new Message({
					client: this.client,
					content: `${commandPrefix}${commandId}`,
					discord: {
						base: msg,
					},
				});
				await newFramedMsg.getMessageElements(guildOrTwitchId);
				await this.plugin.plugins.runCommand(newFramedMsg);
			} catch (error) {
				Logger.error(error.stack);
			}
		}
	}
}
