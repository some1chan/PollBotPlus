import { BaseCommand, BaseMessage, BasePlugin, Logger } from "@framedjs/core";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "commandtemplate",
			about: "Not a real command. Instead, you should copy me!",
			usage: "<required param> [optional param]",
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

		if (msg.args) {
			await msg.send("test");
			return true;
		}

		return false;
	}
}
