/* eslint-disable no-mixed-spaces-and-tabs */
import {
	Argument,
	BaseCommand,
	BaseMessage,
	BasePlugin,
	BotPermissions,
	Discord,
	EmbedHelper,
	Logger,
	FriendlyError,
	DiscordMessage,
} from "@framedjs/core";
import { emotes, oneOptionMsg, optionEmotes } from "../Fun.plugin";
import { oneLine, stripIndents } from "common-tags";
import * as Fun from "../../Fun/Fun.plugin";

type PollOptions = "one" | "once" | "multiple" | "multi" | "single";

interface PollParsedData {
	question: string;
	pollOptions: PollOptions[];
	userOptions: string[];
}

interface PollOptionData {
	options: PollOptions[];
	content: string;
}

const msgUrlKey = "msgUrl";

export default class Poll extends BaseCommand {
	static possibleOptions: PollOptions[] = [
		"one",
		"once",
		"multi",
		"multiple",
		"single",
	];

	readonly originalBotPermissions: Discord.PermissionResolvable[];
	readonly embedBotPermissions: Discord.PermissionResolvable[];
	readonly oneBotOptionPermissions: Discord.PermissionResolvable[];

	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "poll",
			about: oneLine`Create a quick poll through Discord.`,
			description: oneLine`Create a quick poll through Discord.
			${process.env.PBP_DESCRIPTION_AD ?? ""}`,
			usage: '[single] <question> [..."options"]',
			hideUsageInHelp: true,
			examples: stripIndents`
			\`$(command ${plugin.id} poll) Do you like pancakes?\` - Simple poll
			\`$(command ${plugin.id} poll) Best Doki? "Monika" "Just Monika"\` - Embed poll
			\`$(command ${plugin.id} poll) single ANIME'S REAL, RIGHT? "Real" "Not real"\` - Single vote poll`,
			notes: stripIndents`
			The \`one\` option will work unless the bot is momentarily offline.
			${oneLine`For a lasting "choose only one" poll, please use a website like
			[strawpoll.me](https://strawpoll.me) instead!`}`,
			botPermissions: {
				checkAutomatically: false,
				discord: {
					permissions: ["SEND_MESSAGES", "ADD_REACTIONS"],
				},
			},
		});

		this.originalBotPermissions =
			this.botPermissions?.discord?.permissions ?? [];
		this.embedBotPermissions = ["EMBED_LINKS"];
		this.oneBotOptionPermissions = ["MANAGE_MESSAGES"];
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg instanceof DiscordMessage) {
			const parseResults = await Poll.customParse(msg);
			if (!parseResults) return false;

			const pollOptionArgs = parseResults.userOptions;
			const questionContent = parseResults.question.trim();

			// If there some poll options
			if (pollOptionArgs.length >= 1) {
				return this.createEmbedPoll(msg, parseResults);
			} else if (questionContent?.length > 0) {
				return this.createSimplePoll(msg);
			} else {
				await msg.sendHelpForCommand();
				return false;
			}
		}
		return false;
	}

	/**
	 * Based off of Suggest command
	 *
	 * @param msg
	 * @param channel
	 */
	async findCommandMessage(
		msg: DiscordMessage,
		channel:
			| Discord.TextChannel
			| Discord.DMChannel
			| Discord.NewsChannel = msg.discord.channel
	): Promise<Discord.Message | undefined> {
		let msgWithEmbed: Discord.Message | undefined;
		if (msg.discord.msg?.edits) {
			const collection = await channel.messages.fetch({
				around: msg.discord.msg.id,
			});

			const regex = /\[\]\(([^)]*)\)/g;
			for (const [, discordMsg] of collection) {
				const description = discordMsg.embeds[0]?.description;
				if (description) {
					// Attempts to find data in the info embed field
					const matches = description.matchAll(regex);

					for (const match of matches) {
						const args = match[1]?.split(", ");
						if (args && args[0] && args[1]) {
							const msgUrl = args[0];
							const key = args[1].replace(/"/g, "");

							// If the key matches
							if (key == msgUrlKey) {
								// Check if the message ID in the URL matches this one
								const msgUrlArgs = msgUrl.split("/");
								const msgUrlValueId =
									msgUrlArgs[msgUrlArgs.length - 1];

								const thisUrlArgs = msg.discord.msg.url.split(
									"/"
								);
								const thisUrlValueId =
									thisUrlArgs[thisUrlArgs.length - 1];

								if (msgUrlValueId == thisUrlValueId) {
									msgWithEmbed = discordMsg;
								}
							}
						}
					}
				}
			}
		}

		return msgWithEmbed;
	}

	/**
	 *
	 * @param msg
	 * @param pollOptionsArgs
	 * @param askingForOnce
	 */
	async createEmbedPoll(
		msg: DiscordMessage,
		parseResults: PollParsedData
	): Promise<boolean> {
		const hasSingleOption =
			parseResults.pollOptions.includes("once") ||
			parseResults.pollOptions.includes("one") ||
			parseResults.pollOptions.includes("single");
		const userOptions = parseResults.userOptions;
		const question = parseResults.question;

		if (userOptions.length == 1) {
			throw new FriendlyError(
				`${msg.discord.author}, you need at least more than one option!`
			);
		} else if (userOptions.length > Fun.pollLimit) {
			throw new FriendlyError(
				`${msg.discord.author}, you can only have ${Fun.pollLimit} options or less. You have ${userOptions.length}!`
			);
		}

		// Create the description with results
		const reactionEmotes: string[] = [];
		let description = "";
		let hasCodeBlock = false;
		let hasAnyNewContentInOptions = false;

		for (let i = 0; i < userOptions.length; i++) {
			const element = userOptions[i];
			hasCodeBlock = element.endsWith("```");
			if (element) {
				const parse = BaseMessage.parseEmojiAndString(element);

				const reactionEmote = parse.newEmote
					? parse.newEmote
					: optionEmotes[i];
				description += `${reactionEmote}  ${parse.newContent}`;

				if (parse.newContent.trim().length != 0) {
					hasAnyNewContentInOptions = true;
				}

				// If it's not the last element,
				// If there's more than 7 elements
				// If there isn't a codeblock to finish it off
				// Remove the extra new line
				if (i + 1 < userOptions.length) {
					description += "\n";
					if (
						// Is the amount of options less than 8
						userOptions.length < 8 &&
						// Is the end of this option not a codeblock
						!hasCodeBlock &&
						// Is this option not the last one
						i + 1 != userOptions.length
					)
						description += "\n";
				}

				reactionEmotes.push(reactionEmote);
			}
		}

		// Checks for any duplicates. If there is, throw an error
		const testDuplicates: string[] = [];
		for (const emote of reactionEmotes) {
			if (!testDuplicates.includes(emote)) {
				testDuplicates.push(emote);
			} else {
				throw new FriendlyError(
					`${msg.discord.author}, you can't have a duplicate emote (${emote}) for a reaction!`
				);
			}
		}

		let msgWithEmbed: Discord.Message | undefined;
		let newMsg: Discord.Message | undefined;

		try {
			msgWithEmbed = await this.findCommandMessage(msg);
		} catch (error) {
			Logger.error(error.stack);
		}

		if (hasAnyNewContentInOptions) {
			const data = `[](${msg.discord.msg?.url}, "${msgUrlKey}")`;

			// Sends and creates the embed
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, this.id)
			)
				.setTitle(question)
				.setDescription(
					`${data}${description}${hasCodeBlock ? "" : "\n"}` +
						`\nPoll by ${msg.discord.author}` +
						`\n${hasSingleOption ? oneOptionMsg : ""}`
				)
				.setFooter("");

			// Sets up Permission check
			const permData: BotPermissions = {
				discord: {
					permissions: [
						...this.originalBotPermissions,
						...this.embedBotPermissions,
					],
				},
			};
			// if (hasOneOption) {
			// 	permData.discord?.permissions?.push(
			// 		...this.oneBotOptionPermissions
			// 	);
			// }

			// Does the check. If it fails, sends the error and returns false
			const permResults = this.checkBotPermissions(msg, permData);
			if (!permResults.success) {
				await this.sendBotPermissionErrorMessage(
					msg,
					permData,
					permResults
				);
				return false;
			}

			// If there was an existing message found, edit. Otherwise, send a new one.
			if (msgWithEmbed) {
				newMsg = await msgWithEmbed.edit(embed);
			} else {
				newMsg = await msg.discord.channel.send(embed);
			}
		} else {
			// Create a modified simple poll with
			// custom reactions instead, by reusing the old msg
			newMsg = msg.discord.msg;
		}

		// newMsg should never be undefined
		if (!newMsg) {
			throw new FriendlyError();
		}

		// Does the reactions
		await newMsg.fetch();
		await this.react(newMsg, reactionEmotes);
		return true;
	}

	async createSimplePoll(msg: DiscordMessage): Promise<boolean> {
		// Reacts to a message
		// newMsg obtains a message by either msg.discord.msg, or
		// by getting the message through message ID
		const newMsg = msg.discord?.msg;

		if (newMsg) {
			if (newMsg.partial) {
				try {
					Logger.debug("Fetching message for poll");
					await newMsg.fetch();
				} catch (error) {
					Logger.error(
						"Poll.ts: Something went wrong when fetching the message:"
					);
					Logger.error(error);
				}
			}

			const data = this.checkBotPermissions(msg);
			if (data.success) {
				await this.react(newMsg, emotes);
				return true;
			} else {
				await this.sendBotPermissionErrorMessage(
					msg,
					this.botPermissions,
					data
				);
				return false;
			}
		} else {
			return false;
		}
	}

	static parsePollOptions(content: string): PollOptionData {
		const foundOptions: PollOptions[] = [];

		for (const option of this.possibleOptions) {
			const hadThisOption = content.startsWith(`${option} `);
			const lastPartOfMsg =
				content.startsWith(option) &&
				content[content.indexOf(option) + option.length + 1] ==
					undefined;
			if (hadThisOption || lastPartOfMsg) {
				foundOptions.push(option);
				content = content.replace(`${option} `, "");
			}
		}

		return {
			options: foundOptions,
			content: content,
		};
	}

	/**
	 * Does a custom parse, specifically for the Poll parameters
	 * @param msg Framed message
	 * @param silent Should the bot send an error?
	 */
	static async customParse(
		msg: DiscordMessage,
		silent?: boolean
	): Promise<PollParsedData | undefined> {
		// Makes sure prefix, command, and args exist
		if (!msg.args || msg.prefix == undefined || msg.command == undefined) {
			if (!silent)
				Logger.error(
					`Poll.ts: Important elements (prefix, command, and/or args) not found`
				);
			return;
		}

		const data = this.parsePollOptions(msg.getArgsContent());
		let newContent = data.content;

		// Attempts to get arguments with a strict quote section mode in mind,
		// while allowing for the question content to contain quotes.
		let detailedArgs: Argument[] = [];
		let elementExtracted: string;
		let question = "";
		let lastElementQuoted = false;
		do {
			detailedArgs = BaseMessage.getDetailedArgs(newContent, {
				quoteSections: "flexible",
			});

			let failed = false;
			detailedArgs.forEach(arg => {
				// If the argument was closed improperly, or wasn't quoted,
				// the argument hasn't been parsed correctly yet
				if (arg.nonClosedQuoteSection || !arg.wrappedInQuotes) {
					failed = true;
				}
			});

			if (failed) {
				const firstArg = detailedArgs.shift();
				if (firstArg) {
					elementExtracted = firstArg.untrimmedArgument;

					// Re-adds any quotes that were previously parsed out
					let leadingQuote = ``;
					let trailingQuote = ``;
					if (firstArg.wrappedInQuotes) {
						leadingQuote += `"`;
						if (!firstArg.nonClosedQuoteSection) {
							trailingQuote += `"`;
						}
					}
					elementExtracted = `${leadingQuote}${elementExtracted}${trailingQuote}`;

					let extraSpace = "";
					if (lastElementQuoted && firstArg.wrappedInQuotes) {
						extraSpace = " ";
					}
					question += `${extraSpace}${elementExtracted}`;
					newContent = newContent.replace(elementExtracted, "");

					lastElementQuoted = firstArg.wrappedInQuotes;
				} else {
					Logger.error(
						"Poll.ts: lastArg is undefined, but should have exited earlier!"
					);
					break;
				}
			} else {
				break;
			}
		} while (detailedArgs.length > 0);

		const userOptions = BaseMessage.simplifyArgs(detailedArgs);

		// If there's no question, add one from the option arguments.
		// Those come from questions inside quotes
		if (question.length == 0) {
			const newQuestion = userOptions.shift();
			if (newQuestion) {
				question = newQuestion;
			}
		}

		Logger.silly(stripIndents`Poll command data:
			question: '${question}'
			pollOptions: '${data.options}'
			userOptions: [${userOptions}]
		`);

		return {
			pollOptions: data.options,
			question: question,
			userOptions: userOptions,
		};
	}

	/**
	 * Reacts to a Discord message
	 *
	 * @param msg Discord Message
	 * @param reactions Reactions to add
	 */
	async react(msg: Discord.Message, reactions: string[]): Promise<void> {
		// Does the reactions
		for await (const emoji of reactions) {
			if (!msg.reactions.cache.has(emoji)) {
				if (msg.reactions.cache.size < Fun.discordMaxReactionCount) {
					await msg.react(emoji);
				} else {
					Logger.warn(
						`Can't react with ${emoji}; reactions are full`
					);
				}
			}
		}
	}
}
