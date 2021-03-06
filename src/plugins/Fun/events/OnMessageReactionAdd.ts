import { onceOptionMsg, oneOptionMsg } from "../Fun.plugin";
import {
	BaseEvent,
	BaseMessage,
	BasePlugin,
	Discord,
	DiscordMessage,
	EmbedHelper,
	FriendlyError,
	Logger,
} from "@framedjs/core";
import { oneLine } from "common-tags";
import Emoji from "node-emoji";
import Poll from "../commands/Poll";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "pollMessageReactionAdd",
			discord: {
				name: "messageReactionAdd",
			},
		});
	}

	async run(
		reaction: Discord.MessageReaction,
		user: Discord.User | Discord.PartialUser
	): Promise<void> {
		Logger.silly(`Reaction Add From: ${user.id}`);

		if (user.bot) return;

		// https://discordjs.guide/popular-topics/reactions.html#listening-for-reactions-on-old-messages
		// When we receive a reaction we check if the reaction is partial or not
		if (reaction.partial) {
			// If the message this reaction belongs to was removed the fetching
			// might result in an API error, which we need to handle
			try {
				Logger.debug("Fetching reaction...");
				await reaction.fetch();
			} catch (error) {
				Logger.error(
					"OnMessageReactionAdd.ts: Something went wrong when fetching the message:"
				);
				Logger.error(error.stack);
				return;
			}
		}

		const embedDescription = reaction.message.embeds[0]?.description?.toLocaleLowerCase();
		const isPollEmbed = embedDescription?.includes("poll by <@");

		// Finds the place
		const place = reaction.message.guild
			? await BaseMessage.discordGetPlace(
					this.client,
					reaction.message.guild
			  )
			: this.client.provider.places.get("discord_default");
		if (!place) {
			Logger.error("Couldn't find place");
			return;
		}

		const commandRan = await this.client.formatting.format(
			`$(command poll)`,
			place
		);
		const newContent = `${reaction.message.content
			.replace(
				"poll:",
				await this.client.formatting.format(commandRan, place)
			)
			.trim()}`;

		const newMsg = new DiscordMessage({
			client: this.client,
			content: newContent,
			discord: {
				client: reaction.message.client,
				id: reaction.message.id,
				channel: reaction.message.channel,
				author: reaction.message.author,
				guild: reaction.message.guild,
			},
		});
		await newMsg.getMessageElements(place);
		const parsedResults = await Poll.customParse(newMsg, true);

		const singleVoteOnly =
			embedDescription?.endsWith(oneOptionMsg.toLocaleLowerCase()) ||
			embedDescription?.endsWith(onceOptionMsg.toLocaleLowerCase()) ||
			parsedResults?.pollOptions.includes("once") ||
			parsedResults?.pollOptions.includes("one");

		const isPollCommand =
			reaction.message.content.startsWith(commandRan) ||
			reaction.message.content.startsWith("poll:") ||
			isPollEmbed;

		if (isPollCommand && singleVoteOnly) {
			// Gets cached users from reactions
			const fetches = [];
			for (const extraReaction of reaction.message.reactions.cache) {
				const reaction = extraReaction[1];
				if (reaction.users.cache.size != reaction.count) {
					Logger.silly("User count discrepancy found:");
					Logger.silly(
						`  reaction.users.cache.size: ${reaction.users.cache.size}`
					);
					Logger.silly(`  reaction.count: ${reaction.count}`);
					fetches.push(reaction.users.fetch({}));
				}
			}
			try {
				await Promise.all(fetches);
			} catch (error) {
				Logger.error(error.stack);
			}

			// https://discordjs.guide/popular-topics/reactions.html#removing-reactions-by-user
			const extraUserReactions = reaction.message.reactions.cache.filter(
				extraReaction => {
					const userHasReaction = extraReaction.users.cache.has(
						user.id
					);
					const isSimplePollReaction = isPollEmbed != true;
					// Generous/lazy check that tries to get all valid options from the embed
					// TODO: add checks for the emotes at the very beginning of a new line
					const isOptionPollReaction =
						embedDescription?.includes(extraReaction.emoji.name) ==
							true && isPollEmbed == true;
					const extraReactionJustPlaced =
						extraReaction.emoji.name == reaction.emoji.name;

					return (
						userHasReaction &&
						(isSimplePollReaction || isOptionPollReaction) &&
						!extraReactionJustPlaced
					);
				}
			);

			try {
				Logger.debug(oneLine`
					Current reaction: ${reaction.emoji.name} 
					(${Emoji.unemojify(reaction.emoji.name)} unemojified)`);

				const botMember = reaction.message.guild?.me ?? null;

				if (!(reaction.message.channel instanceof Discord.DMChannel)) {
					for await (const reaction of extraUserReactions.values()) {
						if (
							!(
								botMember &&
								botMember.hasPermission(["MANAGE_MESSAGES"])
							)
						) {
							throw new FriendlyError(
								"The bot doesn't have the `MANAGE_MESSAGES` permission!",
								"Bot Missing Permissions"
							);
						}
						Logger.silly(oneLine`
							Removing ${reaction.emoji.name} 
							(${Emoji.unemojify(reaction.emoji.name)} unemojified)`);
						await reaction.users.remove(user.id);
					}
				} else {
					await newMsg.send(
						"The `one` option isn't supported in DMs!"
					);
				}
			} catch (error) {
				if (error instanceof FriendlyError) {
					const embed = EmbedHelper.getTemplate(reaction.message)
						.setTitle(error.friendlyName)
						.setDescription(error.message);
					await reaction.message.channel.send(embed);
				} else {
					Logger.error(error.stack);
				}
			}
		}
	}
}
