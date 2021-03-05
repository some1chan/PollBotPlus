import { BaseCommand, BaseMessage, BasePlugin, Logger } from "@framedjs/core";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "poll:",
			defaultPrefix: "",
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		const commandId = "poll";

		try {
			msg.content = msg.content.replace(
				msg.command ?? this.id,
				await this.client.formatting.format(
					"$(command poll)",
					await BaseMessage.discordGetPlace(
						this.client,
						msg.discord?.guild
					)
				)
			);
			await msg.getMessageElements(
				undefined,
				msg.discord?.guild ?? undefined
			);
			await this.client.commands.getCommand(commandId)?.run(msg);
		} catch (error) {
			Logger.error(error.stack);
		}

		return false;
	}
}
