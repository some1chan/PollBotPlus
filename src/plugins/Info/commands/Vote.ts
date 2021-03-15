import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	DiscordMessage,
	EmbedHelper,
} from "@framedjs/core";
import { stripIndents } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "vote",
			about: "Get the link to vote for the bot.",
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg instanceof DiscordMessage) {
			const link = `https://top.gg/bot/804245390642642965/vote`;

			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, this.id)
			)
				.setTitle("Vote for PollBotPlus")
				.setDescription(stripIndents`
				Your individual vote helps us grow!
				Click [here](${link}) to vote for the bot on top.gg.`);

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
