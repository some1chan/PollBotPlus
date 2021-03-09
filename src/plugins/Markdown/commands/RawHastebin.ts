/* eslint-disable no-mixed-spaces-and-tabs */
import { BaseMessage, BasePlugin, BaseCommand, Logger } from "@framedjs/core";
import { stripIndent } from "common-tags";
import Raw from "./Raw";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "rawhastebin",
			prefixes: ["d."],
			aliases: ["rawhb"],
			about:
				"Escapes all markdown in a message, but stores the results into a file.",
			usage: "[id|link|content]",
			examples: stripIndent`
			\`{{prefix}}{{id}}\`
			\`{{prefix}}{{id}} This ~~is~~ a **test**!\``,
			userPermissions: {
				botOwnersOnly: true,
				checkAutomatically: false,
			},
			inline: true,
			// hideUsageInHelp: true,
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
				`${this.id} called by non-bot user (${msg.discord?.author.id})`
			);
			return false;
		}

		if (msg.discord?.guild && msg.args) {
			const parse = await Raw.getNewMessage(msg, true);
			return await Raw.showStrippedMessage(
				msg,
				this.id,
				parse?.newContent,
				"hastebin"
			);
		}

		return false;
	}
}
