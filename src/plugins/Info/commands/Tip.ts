import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	DiscordMessage,
	EmbedHelper,
} from "@framedjs/core";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "tip",
			about: "Get the link to tip me on Ko-fi.",
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg instanceof DiscordMessage) {
			const link = `https://ko-fi.com/pollbotplus`;

			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, this.id)
			)
				.setTitle("Tip on Ko-fi")
				.setDescription(
					`Tips are greatly appreciated! Click [here](${link}) to go to the Ko-Fi page.`
				);

			await msg.discord.channel.send(
				await this.client.formatting.formatEmbed(
					embed,
					await msg.getPlace()
				)
			);
			return true;
		}

		return false;
	}
}
