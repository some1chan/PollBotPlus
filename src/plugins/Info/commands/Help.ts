/* eslint-disable no-mixed-spaces-and-tabs */
import {
	BasePlugin,
	BaseCommand,
	Discord,
	EmbedHelper,
	InlineOptions,
	Logger,
	BaseMessage,
	Place,
	FriendlyError,
	DiscordMessage,
} from "@framedjs/core";
import { oneLine, oneLineInlineLists, stripIndents } from "common-tags";
import { CustomClient } from "../../../structures/CustomClient";

export default class Help extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "help",
			aliases: ["h", "commands"],
			about: "View help for certain commands and extra info.",
			usage: "[command|page #]",
			examples: stripIndents`
				\`{{prefix}}{{id}}\`
				\`{{prefix}}{{id}} poll\`
				`,
			inline: true,
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg.args && msg instanceof DiscordMessage) {
			const min = 1;
			const max = 2;
			const pageNum = Math.min(
				Math.max(min, Number(msg.args[0] ?? min)),
				max
			);

			switch (pageNum) {
				case 1:
					await this.sendHelpAll(msg);
					return true;
				case 2:
					const place = await msg.getPlace();
					const commandStr = `$(command ${this.plugin.id} poll)`;
					const newFooterText = this.client.formatting.formatCommandNotation(
						`Page ${pageNum}/${max} - Use {{prefix}}{{id}} [page #] to view a new page.`,
						this,
						place
					);

					const embed = await this.client.formatting.formatEmbed(
						EmbedHelper.getTemplate(
							msg.discord,
							await EmbedHelper.getCheckOutFooter(msg, this.id)
						)
							.setTitle("Advanced Usage")
							.setDescription(
								oneLine`
								If you want more out of PollBotPlus,
								check out the following below!`
							)
							.addField(
								"Custom Reactions",
								stripIndents`
								\`${commandStr} Cats or dogs? "🐱" "🐶"\`
								\`${commandStr} Am I running out of poll ideas? "✅ Yes" "👍 Yep"\`
								`
							)
							.addField(
								"Markdown Formatting",
								stripIndents`
								To try this example, copy ALL the text below, and paste!
								\`${commandStr} one Pizza or burger? \`
								\`"🍕 **Pizza** \`\`\`Clearly the better option.\`\`\`"\`
								\`"🍔 **Burger** \`\`\`Clearly the superior option.\`\`\`"\``
							),
						place
					);
					embed.setFooter(`${newFooterText}`, embed.footer?.iconURL);
					await msg.discord.channel.send(embed);
					break;
				default:
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
			}
			return true;
		}
		return false;
	}

	/**
	 * Shows the help message for all commands
	 * @param msg Framed message
	 */
	private async sendHelpAll(msg: BaseMessage): Promise<boolean> {
		if (msg.discord) {
			const unformattedEmbed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, this.id)
			)
				.setTitle("Welcome to PollBotPlus!")
				.setDescription(
					stripIndents`
					PollBotPlus lets you to create polls on Discord quickly, easily, and beautifully.

					To get started, check the **Quick Start**. Try copying, editing, and pasting them!
					To see the rest of what PollBotPlus can do, use \`$(command help) 2\`.`
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
						\`$(command poll) Best Doki? "Monika" "Just Monika"\` - Embed poll
						\`$(command poll) one ANIME'S REAL, RIGHT? "Real" "Not real"\` - Choose one
						`,
					},
					{
						name: "Changing the Prefix",
						value: oneLine`To change this bot's prefix, use \`$(command prefix)\`.
						If you ever forget what this bot's prefix is, you can always use
						\`@PollBotPlus prefix\` to find and change it.`,
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
				await msg.getPlace()
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
		msg: BaseMessage,
		id: string,
		createHelpEmbed: (
			msg: BaseMessage,
			id: string,
			newArgs: string[],
			command: BaseCommand,
			place: Place
		) => Promise<Discord.MessageEmbed | undefined> = Help.createHelpEmbed
	): Promise<Discord.MessageEmbed[]> {
		if (!(msg.client instanceof CustomClient)) {
			Logger.error(
				"CustomClient is needed! This code needs a reference to DatabaseManager"
			);
			throw new FriendlyError(
				oneLine`The bot wasn't configured correctly!
				Contact one of the developers about this issue.`
			);
		}

		if (msg.discord && args[0]) {
			const embeds: Discord.MessageEmbed[] = [];

			// Does a shallow clone of the array
			const newArgs = [...args];
			const command = newArgs.shift();

			const place = await msg.getPlace();

			if (command) {
				// Goes through all matching commands. Hopefully, there's only one, but
				// this allows for edge cases in where two plugins share the same command.
				const matchingCommands = msg.client.commands.getCommands(
					command,
					place
				);

				// Renders all potential help
				for (const baseCommand of matchingCommands) {
					const embed = await createHelpEmbed(
						msg,
						id,
						newArgs,
						baseCommand,
						place
					);
					if (embed) embeds.push(embed);
				}

				// Handles database commands
				const dbCommand = await msg.client.database.findCommand(
					command,
					msg.client.defaultPrefix,
					place
				);
				if (dbCommand) {
					const embed = EmbedHelper.getTemplate(
						msg.discord,
						await EmbedHelper.getCheckOutFooter(msg, id)
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
					msg.client.formatting.formatEmbed(embed, place)
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
		msg: BaseMessage,
		id: string,
		newArgs: string[],
		command: BaseCommand,
		place: Place
	): Promise<Discord.MessageEmbed | undefined> {
		if (!msg.discord) return undefined;

		const embed = EmbedHelper.getTemplate(
			msg.discord,
			await EmbedHelper.getCheckOutFooter(msg, id)
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
		const commandRan = `${command.getDefaultPrefix(place)}${
			command.id
		} ${oneLineInlineLists`${subcommandIds}`}`.trim();
		embed.setTitle(commandRan);

		// The command/subcommand that has the data needed
		const primaryCommand = finalSubcommand ?? command;

		let {
			about,
			description,
			examples,
			notes,
			usage,
		} = primaryCommand.getCommandNotationFormatting(place);

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

		return msg.client.formatting.formatEmbed(embed, place);
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
