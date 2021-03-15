import { BaseCommand, BaseMessage, BasePlugin, Logger } from "@framedjs/core";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "eval",
			about: "Everything goes wrong.",
			usage: "<code>",
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
				`${this.id} called by non-bot user (${msg.discord?.author.id})`
			);
			return false;
		}

		// Double checks because why not
		// if (msg.discord?.author.id != "200340393596944384") {
		// 	// not me, ABORT
		// 	Logger.warn(
		// 		`EVAL command attempted to be used by ${msg.discord?.author.id} or ${msg.twitch?.user}`
		// 	);
		// 	return false;
		// }

		if (process.env.USE_EVAL_COMMAND?.toLocaleLowerCase() == "true") {
			let content = msg.getArgsContent();
			const firstThreeCharacters = content.substring(0, 3);
			const firstFiveCharacters = content.substring(0, 5);
			const lastThreeCharacters = content.substring(
				content.length - 3,
				content.length
			);

			if (
				firstFiveCharacters == "```js" ||
				firstFiveCharacters == "```ts"
			) {
				content = content.substring(6, content.length);
			} else if (firstThreeCharacters == "```") {
				content = content.substring(3, content.length);
			}
			if (lastThreeCharacters == "```") {
				content = content.substring(0, content.length - 3);
			}

			if (
				process.env.USE_FUNCTION_INSTEAD?.toLocaleLowerCase() != "true"
			) {
				const evalResult = eval(content);
				Logger.info(evalResult);
			} else {
				Logger.info(Function(content));
			}
		} else {
			Logger.warn(
				`process.env.USE_EVAL_COMMAND is false (${msg.discord?.author.id} or ${msg.twitch?.user})`
			);
		}

		return false;
	}
}
