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

interface ArgumentOptions {
	/**
	 * If true, this puts the quotes (that are normally removed) inside the arguments.
	 */
	showQuoteCharacters?: boolean;

	/**
	 * If true, parsing will include quoted content into arguments.
	 * This will also parse parts where there may not be any quotes, but
	 * it is possible to infer what exactly would be in it.
	 *
	 * @example
	 * Message.getArgs(`arg 0 "arg 1" args 2`, {
	 * 	separateByQuoteSections: true
	 * });
	 * // Expected Result: ["args 0", "args 1", "args 2"]
	 * // Note that "args 0" and "args 2" didn't have quotes wrapping it.
	 */
	separateByQuoteSections?: boolean;

	/**
	 * If true, this will function mostly the same if separateByQuoteSections was true.
	 *
	 * The difference however is that it will only parse quoted content. If there is anything
	 * outside the quotes, the parse will return undefined.
	 *
	 * @example
	 * Message.getArgs(`"arg 0" "arg 1" "args 2"`, {
	 * 	strictSeparateQuoteSections: true
	 * });
	 * // Expected Result: ["args 0", "args 1", "args 2"]
	 *
	 * @example
	 * Message.getArgs(`"arg 0" arg 1`);
	 * // Expected Result: undefined
	 * // Note that `arg 1` didn't have any quotes wrapping it.
	 */
	strictSeparateQuoteSections?: boolean;

	/**
	 * If set to Flexible, parsing will include quoted content into arguments.
	 * This will also parse parts where there may not be any quotes, but
	 * would be possible to infer what exactly would be in it.
	 *
	 * If set to Strict, parsing will include quoted content into arguments.
	 * Unlike Flexible, parsing will return undefined if there are parts that
	 * isn't wrapped with quotes.
	 *
	 * @example
	 * Message.getArgs(`arg 0 "arg 1"`, {
	 * 	quoteSections: "flexible"
	 * });
	 * // Expected Result: ["args 0", "args 1"]
	 *
	 * @example
	 * Message.getArgs(`"arg 0" "arg 1"`, {
	 * 	quoteSections: "strict"
	 * });
	 * // Expected Result: ["args 0", "args 1"]
	 *
	 * @example
	 * Message.getArgs(`arg 0 "arg 1" arg 2`, {
	 * 	quoteSections: "strict"
	 * });
	 * // Expected Result: []
	 */
	quoteSections?: "strict" | "flexible";
}

enum ArgumentState {
	Quoted,
	Unquoted,
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
	readonly singleOptionPermissions: Discord.PermissionResolvable[];

	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "poll",
			about: oneLine`Create a poll through Discord.`,
			description: oneLine`Create a poll through Discord.
			${process.env.PBP_DESCRIPTION_AD ?? ""}`,
			usage: '[single] <question> [..."options"]',
			hideUsageInHelp: true,
			examples: stripIndents`
			\`$(command ${plugin.id} poll) Do you like pancakes?\` - Simple poll
			\`$(command ${plugin.id} poll) Best Doki? "Monika" "Just Monika"\` - Embed poll
			\`$(command ${plugin.id} poll) single "ANIME'S REAL, RIGHT?" "Real" "Not real"\` - Single vote poll`,
			notes: stripIndents`
			The \`single\` option will work unless the bot is momentarily offline.
			${oneLine`For a lasting single vote poll, please use a website like
			[strawpoll.me](https://strawpoll.me) instead!`}`,
			botPermissions: {
				checkAutomatically: false,
				discord: {
					permissions: [
						"SEND_MESSAGES",
						"ADD_REACTIONS",
						"READ_MESSAGE_HISTORY",
					],
				},
			},
		});

		this.originalBotPermissions =
			this.botPermissions?.discord?.permissions ?? [];
		this.embedBotPermissions = ["EMBED_LINKS"];
		this.singleOptionPermissions = ["MANAGE_MESSAGES"];
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg instanceof DiscordMessage) {
			const parseResults = await Poll.customParse(msg);
			if (!parseResults) return false;

			const userOptions = parseResults.userOptions;
			const questionContent = parseResults.question.trim();

			// If there some poll options
			if (userOptions.length >= 1) {
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

		// Throws a friendly error if there's no question, but there's two options.
		if (!question) {
			throw new FriendlyError(
				oneLine`${msg.discord.author}, there's ${userOptions.length} options but there's no question!`
			);
		} else if (userOptions.length == 1) {
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
		const permResults = this.checkBotPermissions(msg, {
			discord: {
				permissions: [
					...this.originalBotPermissions,
					...this.singleOptionPermissions,
				],
			},
		});
		if (permResults.success) await newMsg.fetch();
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
	 * Get the command arguments from a string, but with more data attached to each argument string
	 *
	 * @param content Message content
	 * @param settings Argument parse settings
	 *
	 * @returns Command arguments
	 */
	static getDetailedArgs(
		content: string,
		settings?: ArgumentOptions
	): Argument[] {
		const args: Argument[] = [];

		// Parse states; for if in a quoted/unquoted section, or is in a codeblock
		let state = ArgumentState.Unquoted;
		let hasCodeBlock = false;

		// What the current argument is
		let argString = "";
		let untrimmedArgString = "";

		const quoteCharType1Start = "“";
		const quoteCharType1End = "”";

		let quoteChar = "";

		for (let i = 0; i < content.length; i++) {
			const char = content[i];

			// Character comparisons
			const charIsDoubleQuote =
				char == `"` ||
				char == quoteCharType1Start ||
				char == quoteCharType1End;
			const charIsSpace = char == " ";
			const charIsCodeBlock = char == "`";

			// Special character comparisons
			const charIsEscaped = content[i - 1] == "\\";
			const charIsEnd = i + 1 == content.length;

			// hasCodeBlock will be true when the message has codeblocks
			if (charIsCodeBlock) hasCodeBlock = !hasCodeBlock;

			// Check for state change
			let stateChanged = false;
			let changeStateToUnquotedLater = false;
			let justStartedQuote = false;

			// If there was a " to close off a quote section
			// and the character hasn't been escaped by a \ or `
			if (charIsDoubleQuote && !(charIsEscaped || hasCodeBlock)) {
				stateChanged = true;

				switch (state) {
					case ArgumentState.Quoted:
						// NOTE: we don't unquote it back immediately, so we
						// can process the last " character
						changeStateToUnquotedLater = true;
						// state = ArgumentState.Unquoted
						break;
					case ArgumentState.Unquoted:
						state = ArgumentState.Quoted;
						justStartedQuote = true;
						break;
				}
			}

			if (state == ArgumentState.Unquoted) {
				// If we're unquoted, split with spaces if settings allow it
				// We'll process excess spaces later
				if (
					!charIsSpace ||
					settings?.quoteSections != undefined ||
					hasCodeBlock
				) {
					if (settings?.quoteSections == "strict") {
						if (!charIsSpace && !charIsDoubleQuote) {
							return [];
						}
					} else {
						argString += char;
						untrimmedArgString += char;
					}
					// Logger.debug(`uq '${argString}'`); // LARGE DEBUG OUTPUT
				} else if (argString.length != 0) {
					// A separator space has been used, so we push our non-empty argument
					// Logger.debug(
					// 	`'${char}' <${content}> ${i} Unquoted "${argString}"`
					// ); // LARGE DEBUG OUTPUT
					// Trim argument string, since we're pushing an unquoted argument
					args.push({
						argument: argString.trim(),
						untrimmedArgument: untrimmedArgString,
						wrappedInQuotes: false,
						nonClosedQuoteSection: false,
					});
					argString = "";
					untrimmedArgString = "";
				}
			} else if (state == ArgumentState.Quoted) {
				// If we've just started the quote, but the string isn't empty,
				// push its contents out (carryover from unquoted)
				if (justStartedQuote) {
					// Logger.debug(
					// 	`'${char}' <${content}> ${i} JSQ_NonEmpty - CStU: ${changeStateToUnquotedLater} justStartedQuote ${justStartedQuote} - (${ArgumentState[state]}) - "${argString}"`
					// ); // LARGE DEBUG OUTPUT

					if (char == `"` && settings?.showQuoteCharacters) {
						// Fixes edge case where we're just entering quotes now,
						// and we have the setting to put it in
						argString += char;
						untrimmedArgString += char;
					} else if (!hasCodeBlock) {
						if (argString.trim().length != 0) {
							// Since it's been carried over as an unquoted argument
							// And is just finishing in quoted, we can trim it here
							args.push({
								argument: argString.trim(),
								untrimmedArgument: untrimmedArgString,
								wrappedInQuotes: false,
								nonClosedQuoteSection: false,
							});
						}
						argString = "";
						untrimmedArgString = "";
					}
				} else if (
					settings?.showQuoteCharacters ||
					!charIsDoubleQuote ||
					charIsEscaped ||
					hasCodeBlock
				) {
					// If we should be showing quoted characters because of settings,
					// or we're unquoted, or there's an escape if not
					argString += char;
					untrimmedArgString += char;
					// Logger.debug(` q '${argString}'`); // LARGE DEBUG OUTPUT
				}
			}

			// If state change, and the first character isn't a " and just that,
			// or this is the end of the string,
			// push the new argument
			if (
				(stateChanged && !justStartedQuote) ||
				(charIsEnd && argString.length > 0)
			) {
				// Is ending off with a quote
				// Logger.debug(
				// 	`'${char}' <${content}> ${i} State change - CStU: ${changeStateToUnquotedLater} justStartedQuote ${justStartedQuote} - (${ArgumentState[state]}) - "${argString}"`
				// ); // LARGE DEBUG OUTPUT

				const nonClosedQuoteSection =
					charIsEnd &&
					argString.length > 0 &&
					settings?.quoteSections == "strict" &&
					!charIsDoubleQuote;

				// Trim if unquoted
				if (state == ArgumentState.Unquoted)
					argString = argString.trim();

				if (settings?.quoteSections == "strict") {
					if (nonClosedQuoteSection) {
						return [];
					}
				}

				args.push({
					argument: argString,
					untrimmedArgument: untrimmedArgString,
					wrappedInQuotes: state == ArgumentState.Quoted,
					nonClosedQuoteSection: nonClosedQuoteSection,
				});

				argString = "";
				untrimmedArgString = "";
			}

			// Finally changes the state to the proper one
			// We don't do this for quotes because we need to process putting the " in or not
			if (changeStateToUnquotedLater) {
				state = ArgumentState.Unquoted;
			}
		}

		return args;
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
			detailedArgs = Poll.getDetailedArgs(newContent, {
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
		// Those come from questions inside quotes.
		// BUT if the user options isn't sufficient for it, we don't do this
		if (question.length == 0 && userOptions.length != 2) {
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
					try {
						await msg.react(emoji);
					} catch (error) {
						Logger.error(error);
					}
				} else {
					Logger.warn(
						`Can't react with ${emoji}; reactions are full`
					);
				}
			}
		}
	}
}
