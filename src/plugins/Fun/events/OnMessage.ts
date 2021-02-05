import { BaseEvent, BasePlugin, Discord, Message } from "@framedjs/core";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "pollMessage",
			discord: {
				name: "message",
			},
		});
	}

	async run(msg: Discord.Message): Promise<void> {
		const legacyPollString = "poll:";

		const commandId = "poll";

		const place = Message.discordGetPlace(
			this.client,
			msg.guild
		);
		const commandPrefix = this.plugin.commands
			.get(commandId)
			?.getDefaultPrefix(place);
		const newContent = msg.content
			.replace(legacyPollString, `${commandPrefix}${commandId}`)
			.trim();

		if (msg.content.startsWith(legacyPollString)) {
			const newMsg = new Message({
				client: this.client,
				content: newContent,
				discord: {
					base: msg,
				},
			});
			await newMsg.getMessageElements();
			this.client.plugins.runCommand(newMsg);
		}
	}
}
