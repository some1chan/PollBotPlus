/* eslint-disable no-mixed-spaces-and-tabs */
import {
	Argument,
	BaseCommand,
	BasePlugin,
	Discord,
	EmbedHelper,
	PluginManager,
	Logger,
	Message,
	FriendlyError,
} from "@framedjs/core";
import { emotes, oneOptionMsg, optionEmotes } from "../Fun.plugin";
import { oneLine, stripIndents } from "common-tags";
import * as Fun from "../../Fun/Fun.plugin";

export default class Poll extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "poll",
			about: "Create a quick poll through Discord.",
			usage: '[once] <question> [..."options"]',
			hideUsageInHelp: true,
			examples: stripIndents`
			\`$(command ${plugin.id} poll) Do you like pancakes?\` - Simple poll
			\`$(command ${plugin.id} poll) Pizza or burger? "🍕" "🍔"\` -  Custom reactions
			\`$(command ${plugin.id} poll) Best Doki? "Natsuki" "Sayori" "Yuri" "M̵on̸ika̷"\` - Embed poll
			\`$(command ${plugin.id} poll) Am I running out of poll ideas? "✅ Yes" "👍 Yep"\` - Custom reactions
			\`$(command ${plugin.id} poll) once ANIME'S REAL, RIGHT? "Real" "Not real"\` - Choose once`,
			notes: stripIndents`
			The \`once\` option will work unless the bot is momentarily offline.
			${oneLine`For a lasting "choose only once" poll, please use a website like
			[strawpoll.me](https://strawpoll.me) instead!`}`,
		});
	}

	async run(msg: Message): Promise<boolean> {
		if (msg.discord) {
			const parseResults = await Poll.customParse(msg);
			if (!parseResults) return false;

			const pollOptionArgs = parseResults.pollOptionArgs;
			const questionContent = parseResults.question;

			// If there some poll options
			if (pollOptionArgs.length >= 1) {
				return this.createEmbedPoll(msg, parseResults);
			} else if (questionContent?.length > 0) {
				return this.createSimplePoll(msg);
			} else {
				await PluginManager.sendHelpForCommand(
					msg,
					await msg.getPlace()
				);
				return false;
			}
		}
		return false;
	}

	/**
	 *
	 * @param msg
	 * @param pollOptionsArgs
	 * @param askingForOnce
	 */
	async createEmbedPoll(
		msg: Message,
		parseResults: {
			onceMultipleOption: string;
			question: string;
			pollOptionArgs: string[];
		}
	): Promise<boolean> {
		if (!msg.discord) return false;

		const askingForOnce = parseResults.onceMultipleOption == "once";
		const pollOptionArgs = parseResults.pollOptionArgs;
		const questionContent = parseResults.question;

		if (pollOptionArgs.length == 1) {
			throw new FriendlyError(
				`${msg.discord.author}, you need at least more than one option!`
			);
		} else if (pollOptionArgs.length > Fun.pollLimit) {
			throw new FriendlyError(
				`${msg.discord.author}, you can only have ${Fun.pollLimit} options or less. You have ${pollOptionArgs.length}!`
			);
		}

		// Create the description with results
		const reactionEmotes: string[] = [];
		let description = "";
		let hasCodeBlock = false;
		let hasAnyNewContentInOptions = false;

		for (let i = 0; i < pollOptionArgs.length; i++) {
			const element = pollOptionArgs[i];
			hasCodeBlock = element.endsWith("```");
			if (element) {
				const parse = Message.parseEmojiAndString(element);

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
				if (i + 1 < pollOptionArgs.length) {
					description += "\n";
					if (
						// Is the amount of options less than 8
						pollOptionArgs.length < 8 &&
						// Is the end of this option not a codeblock
						!hasCodeBlock &&
						// Is this option not the last one
						i + 1 != pollOptionArgs.length
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

		let newMsg: Discord.Message | undefined;

		if (hasAnyNewContentInOptions) {
			// Sends and creates the embed
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, this.id)
			)
				.setTitle(questionContent)
				.setDescription(
					`${description}${hasCodeBlock ? "" : "\n"}` +
						`\nPoll by ${msg.discord.author}` +
						`\n${askingForOnce ? oneOptionMsg : ""}`
				)
				.setFooter("");
			newMsg = await msg.discord.channel.send(embed);
		} else {
			// Create a modified simple poll instead,
			// by reusing the old msg
			newMsg = msg.discord.msg;
		}

		// newMsg should never be undefined
		if (!newMsg) {
			throw new FriendlyError();
		}

		// Does the reactions
		for await (const emoji of reactionEmotes) {
			await newMsg.react(emoji);
		}

		return true;
	}

	async createSimplePoll(msg: Message): Promise<boolean> {
		// Reacts to a message
		// newMsg obtains a message by either msg.discord.msg, or
		// by getting the message through message ID
		const newMsg = msg.discord?.msg;

		if (newMsg) {
			const msgReact: Promise<Discord.MessageReaction>[] = [];
			emotes.forEach(element => {
				msgReact.push(newMsg.react(element));
			});
			await Promise.all(msgReact);
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Does a custom parse, specifically for the Poll parameters
	 * @param msg Framed message
	 * @param silent Should the bot send an error?
	 */
	static async customParse(
		msg: Message,
		silent?: boolean
	): Promise<
		| {
				onceMultipleOption: string;
				question: string;
				pollOptionArgs: string[];
		  }
		| undefined
	> {
		// Makes sure prefix, command, and args exist
		if (!msg.args || !msg.prefix || !msg.command) {
			if (!silent)
				Logger.error(
					`Poll.ts: Important elements (prefix, command, and/or args) not found`
				);
			return;
		}

		let newContent = msg.getArgsContent();
		const newArgs = Message.getArgs(newContent, {
			quoteSections: "flexible",
		});

		let onceMultipleOption = "";

		const isOnce = newContent.startsWith("once");
		const isMultiple = newContent.startsWith("multiple");
		const isMulti = newContent.startsWith("multi");
		const isOnceOrMultiple = isOnce || isMultiple || isMulti;

		// Removes the once/multiple parma from newContent
		if (isOnceOrMultiple) {
			if (isOnce) {
				onceMultipleOption = "once";
			} else if (isMultiple) {
				onceMultipleOption = "multiple";
			} else if (isMulti) {
				onceMultipleOption = "multi";
			}

			// Handles combined "once question"
			newContent = newContent.replace(`${onceMultipleOption} `, ``);

			// If there is no content now, the argument was alone before.
			// This means we can remove it from args
			if (newArgs[0].length == 0) {
				newArgs.shift();
			}
		}

		// Attempts to get arguments with a strict quote section mode in mind,
		// while allowing for the question content to contain quotes.
		let detailedArgs: Argument[] = [];
		let elementExtracted: string;
		let question = "";
		let lastElementQuoted = false;
		do {
			detailedArgs = Message.getDetailedArgs(newContent, {
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

		const pollOptionArgs = Message.simplifyArgs(detailedArgs);

		// If there's no question, add one from the option arguments.
		// Those come from questions inside quotes
		if (question.length == 0) {
			const newQuestion = pollOptionArgs.shift();
			if (newQuestion) {
				question = newQuestion;
			}
		}

		Logger.silly(stripIndents`
			new Poll.ts: 
			newContent: '${newContent}'
			newArgs: '${newArgs}'

			question: '${question}'
			onceMultipleOption: '${onceMultipleOption}'
			pollOptionsArgs: [${pollOptionArgs}]
		`);

		return {
			question,
			onceMultipleOption,
			pollOptionArgs,
		};
	}
}
