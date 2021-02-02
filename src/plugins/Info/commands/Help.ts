/* eslint-disable no-mixed-spaces-and-tabs */
import {
	BasePlugin,
	BaseCommand,
	Discord,
	EmbedHelper,
	InlineOptions,
	Message,
	Logger,
} from "@framedjs/core";
import { oneLine, oneLineInlineLists, stripIndents } from "common-tags";

export default class Help extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "help",
			aliases: ["h", "commands"],
			about: "View help for certain commands and extra info.",
			usage: "[command]",
			examples: stripIndents`
				\`{{prefix}}{{id}}\`
				\`{{prefix}}{{id}} poll\`
				`,
			inline: true,
		});
	}

	async run(msg: Message): Promise<boolean> {
		if (msg.args) {
			if (msg.args[0]) {
				// Sends help through Embed
				if (msg.discord) {
					const embeds = await Help.sendHelpForCommand(
						msg.args,
						msg,
						this.id
					);
					for await (const embed of embeds) {
						await msg.discord.channel.send(embed);
					}
				}
				return true;
			} else {
				return this.sendHelpAll(msg);
			}
		}
		return false;
	}

	/**
	 * Shows the help message for all commands
	 * @param msg Framed message
	 */
	private async sendHelpAll(msg: Message): Promise<boolean> {
		if (msg.discord) {
			const unformattedEmbed = EmbedHelper.getTemplate(
				msg.discord,
				this.client.helpCommands,
				this.id
			)
				.setTitle("Welcome to PollBotPlus!")
				.setDescription(
					stripIndents`
					PollBotPlus lets you to create polls on Discord quickly, easily, and beautifully.

					To get started, check the Quick Start. Try copying, editing, and pasting them!
					If you'd like to learn more, use \`$(command poll)\` by itself.`
				)
				.addFields([
					{
						name: "Quick Start",
						/*
						 * Pancakes     - OneShot (but barely)
						 * Best Doki    - DDLC
						 * Anime's real - Undertale
						 */
						value: stripIndents`
						\`$(command poll) Do you like pancakes?\` - Simple poll
						\`$(command poll) Best Doki? "Monika" "J̶ust̴ M̵on̸i̸k̷a̷"\` - Embed poll
						\`$(command poll) once ANIME'S REAL, RIGHT? "Real" "Not real"\` - Choose once
						`,
					},
					{
						name: "Changing the Prefix",
						value: oneLine`To change this bot's prefix, use
						\`@PollBotPlus prefix !\` to change it to the \`!\` prefix.
						You can also use \`$(command prefix) !\`, but that would also change
						that command's prefix too.`,
					},
					// {
					// 	name: `Support the Bot!`,
					// 	value: oneLine`
					// 		To get PollBotPlus Premium, click [here](https://patreon.com/some1chan). This helps
					// 		[@some1chan](https://twitter.com/some1chan) develop and
					// 		maintain cool bots like these, and pay for server costs!`,
					// },
					{
						name: "Links",
						value: stripIndents`
						**[Support Server](https://discord.gg/RYbkcHfrnR)**  - Got any questions? Join the support server.
						**[Bot Invite](https://discord.com/api/oauth2/authorize?client_id=${this.client.discord.client?.user?.id}&permissions=355392&scope=bot)** - Want this bot on your own server? Invite the bot.
						**[Vote on top.gg](https://top.gg/bot/804245390642642965)** - Want to support me for free? Vote for this bot.
						**[Support Me](https://ko-fi.com/pollbotplus)** - Want to support me financially? Tip me on Ko-Fi!
						`,
					},
				])
				.setFooter("Thank you for using PollBotPlus!");
			const embed = await this.client.formatting.formatEmbed(
				unformattedEmbed,
				await msg.getGuildOrTwitchId()
			);

			await msg.discord.channel.send(embed);
			return true;
		}
		return false;
	}

	/**
	 * Show help message for a command
	 *
	 * @param args Message arguments
	 * @param msg Framed Message
	 * @param id Command ID for embed
	 * @param createHelpEmbed The function that will parse and create all embeds.
	 */
	static async sendHelpForCommand(
		args: string[],
		msg: Message,
		id: string,
		createHelpEmbed: (
			msg: Message,
			id: string,
			newArgs: string[],
			command: BaseCommand,
			guildOrTwitchId: string
		) => Promise<Discord.MessageEmbed | undefined> = Help.createHelpEmbed
	): Promise<Discord.MessageEmbed[]> {
		if (msg.discord && args[0]) {
			const embeds: Discord.MessageEmbed[] = [];

			// Does a shallow clone of the array
			const newArgs = [...args];
			const command = newArgs.shift();

			const guildOrTwitchId = await msg.getGuildOrTwitchId();

			if (command) {
				// Goes through all matching commands. Hopefully, there's only one, but
				// this allows for edge cases in where two plugins share the same command.
				const matchingCommands = msg.client.plugins.getCommands(
					command
				);

				// Renders all potential help
				for (const baseCommand of matchingCommands) {
					const embed = await createHelpEmbed(
						msg,
						id,
						newArgs,
						baseCommand,
						guildOrTwitchId
					);
					if (embed) embeds.push(embed);
				}

				// Handles database commands
				const dbCommand = await msg.client.database.findCommand(
					command,
					msg.client.defaultPrefix,
					guildOrTwitchId ? guildOrTwitchId : "default"
				);
				if (dbCommand) {
					const embed = EmbedHelper.getTemplate(
						msg.discord,
						msg.client.helpCommands,
						id
					);
					// Shows the command/subcommand chain
					// ex. .command add
					const commandRan = `${dbCommand.defaultPrefix.prefix}${dbCommand.id}`;
					embed.setTitle(commandRan);

					// Get the description
					let description = dbCommand.response.description;
					if (!description) {
						description = `*No about or description set for the command.*`;
					}
					embed.setDescription(description);

					embeds.push(embed);
				}
			}

			// Handles all the $() formatting all at once
			const processingEmbeds: Promise<Discord.MessageEmbed>[] = [];
			for (const embed of embeds) {
				processingEmbeds.push(
					msg.client.formatting.formatEmbed(embed, guildOrTwitchId)
				);
			}
			const processedEmbeds = await Promise.allSettled(processingEmbeds);
			const readyEmbeds: Discord.MessageEmbed[] = [];
			for (const embed of processedEmbeds) {
				switch (embed.status) {
					case "rejected":
						Logger.error(embed.reason);
						break;
					default:
						readyEmbeds.push(embed.value);
						break;
				}
			}

			return readyEmbeds;
		}

		return [];
	}

	/**
	 * Creates embeds containing help data
	 *
	 * @param msg Framed Message
	 * @param id Command ID for embed
	 * @param newArgs Message arguments
	 * @param command BaseCommand
	 */
	static async createHelpEmbed(
		msg: Message,
		id: string,
		newArgs: string[],
		command: BaseCommand,
		guildOrTwitchId = "default"
	): Promise<Discord.MessageEmbed | undefined> {
		if (!msg.discord) return undefined;

		const embed = EmbedHelper.getTemplate(
			msg.discord,
			msg.client.helpCommands,
			id
		);

		// Get potential subcommand
		const subcommands = command.getSubcommandChain(newArgs);
		const finalSubcommand = subcommands[subcommands.length - 1];

		// Get the IDs fo all of them
		const subcommandIds: string[] = [];
		subcommands.forEach(subcommand => {
			subcommandIds.push(subcommand.id);
		});

		// Shows the command/subcommand chain
		// ex. .command add
		const commandRan = `${command.getDefaultPrefix(guildOrTwitchId)}${
			command.id
		} ${oneLineInlineLists`${subcommandIds}`}`.trim();
		embed.setTitle(commandRan);

		// The command/subcommand that has the data needed
		const primaryCommand = finalSubcommand ? finalSubcommand : command;

		let {
			about,
			description,
			examples,
			notes,
			usage,
		} = primaryCommand.getCommandNotationFormatting(guildOrTwitchId);

		// Get the description
		if (!description) {
			if (about) {
				description = about;
			} else {
				description = `*No about or description set for the command.*`;
			}
		}
		embed.setDescription(description);

		// Gets the usage text
		if (usage) {
			const guideMsg = `Type \`$(command default.bot.info usage)\` for more info.`;
			const usageMsg = `\`${commandRan} ${usage}\``;
			embed.addField(
				"Usage",
				`${guideMsg}\n${usageMsg}`,
				Help.useInline(primaryCommand, "usage")
			);
		}

		// Get the examples text
		if (examples) {
			embed.addField(
				"Examples",
				`Try copying and editing them!\n${examples}`,
				Help.useInline(primaryCommand, "examples")
			);
		}

		// Get the notes text
		if (notes) {
			embed.addField(
				"Notes",
				notes,
				Help.useInline(primaryCommand, "notes")
			);
		}

		return msg.client.formatting.formatEmbed(embed, guildOrTwitchId);
	}

	/**
	 * Use inline
	 * @param command 
	 * @param index 
	 */
	static useInline(
		command: BaseCommand,
		index: keyof InlineOptions
	): boolean {
		// If the whole this is set to a true/false value, return that
		if (typeof command.inline == "boolean") {
			return command.inline;
		}

		// Object means it's InlineOptions
		if (typeof command.inline == "object") {
			const enableAllUnlessSpecified =
				command.inline.enableAllUnlessSpecified;
			const inlineValue = command.inline[index];

			// If enableAllUnlessSpecified is true, everything should pass as true,
			// unless the inline value has been set to false (not true or undefined)
			if (enableAllUnlessSpecified) {
				return inlineValue != false;
			} else {
				// Return like normal
				return inlineValue == true;
			}
		}

		// If command.inline isn't set/was undefined, return false
		return false;
	}
}
