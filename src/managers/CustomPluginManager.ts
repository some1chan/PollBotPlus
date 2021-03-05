import {
	BaseCommand,
	BaseMessage,
	Client,
	Discord,
	HelpData,
	Place,
	PluginManager,
} from "@framedjs/core";

import { DatabaseManager } from "./DatabaseManager";
import Command from "../database/entities/Command";

export class CustomPluginManager extends PluginManager {
	database: DatabaseManager;

	constructor(client: Client, databaseManager: DatabaseManager) {
		super(client);
		this.database = databaseManager;
	}

	/**
	 * Creates Discord embed field data from plugin commands, showing commands.
	 *
	 * @param helpList Data to choose certain commands
	 * @param place Place data
	 *
	 * @returns Discord embed field data, containing brief info on commands
	 */
	async createHelpFields(
		helpList: HelpData[],
		place: Place
	): Promise<Discord.EmbedFieldData[]> {
		const connection = this.database.connection;
		if (!connection)
			throw new ReferenceError(DatabaseManager.errorNoConnection);

		const fields: Discord.EmbedFieldData[] = [];
		const entries = new Map<
			/** Command ID */
			string,
			{
				description: string;
				group: string;
				small: boolean;
			}
		>();
		const commandRepo = connection.getRepository(Command);

		const databaseCommands = await commandRepo.find({
			relations: ["response", "group", "defaultPrefix"],
		});

		const groupIconMap = new Map<string, string>();
		const pluginCommandMap = new Map<string, BaseCommand[]>();

		// Combine both commands and aliases into one variable
		// Then, set them all into the map
		this.client.plugins.map.forEach(plugin => {
			const pluginCommands = Array.from(plugin.commands.values());
			pluginCommandMap.set(plugin.id, pluginCommands);
		});

		// Gets all plugin command and alias references, along
		// with exhausting all possible categories
		for (const baseCommands of pluginCommandMap.values()) {
			// Gets all the groups and their icons
			for (const baseCommand of baseCommands) {
				groupIconMap.set(
					baseCommand.group,
					baseCommand.groupEmote ?? "❔"
				);
			}

			// Goes through all of the help elements
			for (const helpElement of helpList) {
				// Check in each command in array
				for (const commandElement of helpElement.commands) {
					const args = BaseMessage.getArgs(commandElement);
					const command = args.shift();

					if (command == undefined) {
						throw new Error("command is null or undefined");
					}

					const foundData = (
						await this.client.commands.getFoundCommandData(
							command,
							args,
							place
						)
					)[0];

					// If there's a command found,
					if (foundData) {
						const commandString = this.client.formatting.getCommandRan(
							foundData,
							place
						);
						const lastSubcommand =
							foundData.subcommands[
								foundData.subcommands.length - 1
							];
						const baseCommand = lastSubcommand
							? lastSubcommand
							: foundData.command;

						const usage =
							baseCommand.usage && !baseCommand.hideUsageInHelp
								? ` ${baseCommand.usage}`
								: "";
						const about = baseCommand.about
							? ` - ${baseCommand.about}\n`
							: " ";
						entries.set(commandElement, {
							group: baseCommand.groupEmote
								? baseCommand.groupEmote
								: "Unknown",
							description: `\`${commandString}${usage}\`${about}`,
							small: baseCommand.about != undefined,
						});
					}
				}
			}
		}

		// Searches through database
		for await (const command of databaseCommands) {
			let content = `\`${command.defaultPrefix.prefix}${command.id}\``;
			let small = false;

			const description = command.response?.description;

			if (description) {
				content = `${content} - ${description}\n`;
			} else {
				content += ` `;
				small = true;
			}

			const group = command.group.name;
			const emote = command.group.emote ?? "❔";

			groupIconMap.set(group, emote);

			entries.set(command.id, {
				group: group,
				description: content,
				small,
			});
		}

		// Clones arrays to get a new help list, and a list of unparsed commands.
		const clonedHelpList: HelpData[] = JSON.parse(JSON.stringify(helpList));
		const unparsedCommands: Command[] = [...databaseCommands];

		// Goes through the new help list to add database commands
		clonedHelpList.forEach(helpElement => {
			databaseCommands.forEach(command => {
				const groupName = command.group.name;

				if (groupName) {
					// If there's a matching group, add it to the list
					if (helpElement.group == groupName) {
						helpElement.commands.push(command.id);

						// Remove the parsed command from the unparsed command list
						unparsedCommands.splice(
							unparsedCommands.indexOf(command),
							1
						);
					}
				}
			});
		});

		// Put all unparsed commands that didn't have any matching group to
		// be in the Other group. Then, if there is any new data, push it in.
		const newHelpData: HelpData[] = [];
		unparsedCommands.forEach(command => {
			const matchingHelpData = newHelpData.find(
				data => data.group == command.group.name
			);

			if (!matchingHelpData) {
				const data: HelpData = {
					group: command.group.name,
					commands: [command.id],
				};
				newHelpData.push(data);
			} else {
				matchingHelpData.commands.push(command.id);
			}
		});
		clonedHelpList.push(...newHelpData);

		// Loops through all of the help elements,
		// in order to sort them properly like in the data
		for (let i = 0; i < clonedHelpList.length; i++) {
			const helpElement = clonedHelpList[i];

			let description = "";
			let smallCommands = "";
			let icon = groupIconMap.get(helpElement.group);

			if (!icon) {
				icon = groupIconMap.get("Other");
				if (!icon) {
					icon = "❔";
				}
			}

			// Goes through each command in help, and finds matches in order
			helpElement.commands.forEach(command => {
				const text = entries.get(command);
				if (text) {
					if (!text.small) {
						description += `${text.description}`;
					} else {
						smallCommands += `${text.description}`;
					}
				}
			});

			// Push everything from this group into a Embed field
			fields.push({
				name: `${icon} ${helpElement.group}`,
				value: `${description}${smallCommands}`,
			});
		}

		return fields;
	}

	/**
	 * Create embed field data on all of the commands in the database.
	 *
	 * @returns Discord embed field data
	 */
	async createInfoHelpFields(): Promise<
		Discord.EmbedFieldData[] | undefined
	> {
		const connection = this.database.connection;
		if (!connection) return undefined;

		const fields: Discord.EmbedFieldData[] = [];
		const commandRepo = connection.getRepository(Command);
		const commands = await commandRepo.find({
			relations: ["defaultPrefix", "response"],
		});

		const contentNoDescriptionList: string[] = [];
		const contentList: string[] = [];

		for await (const command of commands) {
			let content = `\`${command.defaultPrefix.prefix}${command.id}\``;
			const description = command.response?.description;

			if (description) {
				content = `${content} - ${description}\n`;
				contentList.push(content);
			} else {
				content += ` `;
				contentNoDescriptionList.push(content);
			}
		}

		let content = "";
		contentNoDescriptionList.forEach(element => {
			content += element;
		});

		if (content.length > 0) {
			content += "\n";
		}

		contentList.forEach(element => {
			content += element;
		});

		// If there's something to push
		if (content.length > 0) {
			fields.push({
				name: "Other",
				value: content,
			});
			return fields;
		} else {
			return undefined;
		}
	}
}
