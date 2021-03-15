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
			id: "support",
			about: "Get the invite link to the support server.",
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		const link = `https://discord.gg/RYbkcHfrnR`;

		if (msg instanceof DiscordMessage) {
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, this.id)
			)
				.setTitle("PollBotPlus Support")
				.setDescription(
					`Click [here](${link}) to join the support server!`
				);
					
			if (
				msg.discord.guild &&
				msg.discord.guild.available &&
				msg.discord.guild.client.user &&
				msg.discord.channel.type != "dm"
			) {
				const permissions = msg.discord.channel.permissionsFor(
					msg.discord.guild.client.user
				);

				if (!permissions?.has("EMBED_LINKS")) {
					await msg.discord.channel.send(
						`**${embed.title}**\n${link}`
					);
					return true;
				}
			}

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
