import {
	Client,
	ClientOptions,
	Discord,
	DiscordMessage,
	Logger,
} from "@framedjs/core";
import { oneLine } from "common-tags";
import { CustomCommandManager } from "../managers/CustomCommandManager";
import { CustomPluginManager } from "../managers/CustomPluginManager";
import { DatabaseManager } from "../managers/DatabaseManager";
import { TypeORMProvider } from "../providers/TypeORMProvider";

export class CustomClient extends Client {
	database: DatabaseManager;

	constructor(options: ClientOptions, connectionName?: string) {
		super(options);

		this.database = new DatabaseManager(this, connectionName);
		this.commands = new CustomCommandManager(this, this.database);
		this.plugins = new CustomPluginManager(this, this.database);
		this.provider = new TypeORMProvider(this, connectionName);
	}

	protected setupDiscordEvents(client: Discord.Client): void {
		client.on("ready", async () => {
			Logger.info(`Logged in as ${client.user?.tag}.`);

			// Invite link
			client
				.generateInvite({
					permissions: [
						// Likely required for most bots
						"SEND_MESSAGES",

						// Used in help command, but also allows the potential to use emojis from other servers
						"USE_EXTERNAL_EMOJIS",

						// Used for getting old messages with polls, after a restart
						"READ_MESSAGE_HISTORY",

						// Reactions and embeds needed for polls
						"ADD_REACTIONS",
						"EMBED_LINKS",

						// Extra permissions for just-in-case
						"MANAGE_MESSAGES",
						"VIEW_CHANNEL",
					],
				})
				.then(link =>
					Logger.info(`Generated bot invite link:\n${link}`)
				)
				.catch(Logger.error);
		});

		client.on("guildCreate", async guild => {
			Logger.info(`Joined a new guild: "${guild.name}" (${guild.id})`);
		});

		client.on("guildDelete", async guild => {
			Logger.info(`Left a guild: "${guild.name}" (${guild.id})`);
		});

		client.on("message", async discordMsg => {
			const msg = new DiscordMessage({
				client: this,
				discord: {
					base: discordMsg,
				},
			});
			await msg.getMessageElements(
				undefined,
				discordMsg.guild ?? undefined
			);
			this.processMsg(msg);
		});

		client.on("warn", warning => {
			Logger.warn(`Discord.js - ${warning}`);
		});

		client.on("error", error => {
			Logger.error(`Discord.js - ${error}`);
		});

		client.on("rateLimit", info => {
			// Logger.warn(`We're being rate-limited! ${util.inspect(info)}`);
			Logger.warn(oneLine`Rate limit: ${info.method} ${info.timeout}
			${info.limit} ${info.path} ${info.timeDifference}`);
		});

		client.on("messageUpdate", async (partialOld, partialNew) => {
			try {
				Logger.silly(`Message Update`);

				// Attempts to fetch a partial message, if the bot has permission to do so
				let newMessage: Discord.Message;
				if (partialNew.partial) {
					try {
						if (
							partialOld.guild?.available &&
							partialOld.guild?.me
						) {
							const requestedBotPerms = new Discord.Permissions([
								"READ_MESSAGE_HISTORY",
							]);
							const actualBotPerms = new Discord.Permissions(
								partialOld.guild.me.permissionsIn(
									partialOld.channel
								)
							);

							if (
								actualBotPerms.missing(requestedBotPerms)
									.length > 0
							) {
								return;
							}
						}
						newMessage = await partialNew.channel.messages.fetch(
							partialNew.id
						);
					} catch (error) {
						Logger.error("Error trying to fetch:");
						Logger.error(error.stack);
						return;
					}
				} else {
					newMessage = partialNew;
				}

				// If the content is the same, but something changed (ex. pinned, embed) ignore it
				// to avoid running a command multiple times
				if (partialOld.content == newMessage.content) {
					return;
				}

				// Edge case: pinned uncached messages could still go through.
				// Pins shouldn't be treated as retriggering of commands
				if (!partialOld.pinned && newMessage.pinned) {
					return;
				}

				const msg = new DiscordMessage({
					client: this,
					discord: {
						base: newMessage,
					},
				});
				await msg.getMessageElements(
					undefined,
					msg.discord.guild ?? undefined
				);
				this.processMsg(msg);
			} catch (error) {
				Logger.error(error.stack);
			}
		});
	}
}
