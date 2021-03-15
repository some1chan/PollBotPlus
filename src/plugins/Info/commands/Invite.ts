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
			id: "invite",
			about: "Get the invite link to the bot.",
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg instanceof DiscordMessage) {
			const link =
				`https://discord.com/api/oauth2/authorize?client_id=` +
				`${msg.discord.client.user?.id}&permissions=355392&scope=bot`;

			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, this.id)
			)
				.setTitle("Invite PollBotPlus")
				.setDescription(`Click [here](${link}) to invite the bot to your Discord server!`);

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
