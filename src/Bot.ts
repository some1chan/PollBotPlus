// https://www.stefanjudis.com/today-i-learned/measuring-execution-time-more-precisely-in-the-browser-and-node-js/
const startTime = process.hrtime();
console.log("Starting the bot... This might take a while.");

import * as Framed from "@framedjs/core";
const Logger = Framed.Logger;
Logger.level = process.env.LOGGER_LEVEL ? process.env.LOGGER_LEVEL : "silly";

//#region Gets the version of the app

import fs from "fs";
import path from "path";
let appVersion: string | undefined;
try {
	const packageFile = fs.readFileSync(
		path.resolve(__dirname, "../package.json"),
		"utf8"
	);
	const packageJson = JSON.parse(packageFile);
	appVersion = packageJson.version;
} catch (error) {
	Logger.error(error.stack);
}

Logger.info(
	`Starting PollBotPlus v${
		appVersion ? appVersion : "???"
	}, currently running Framed.js v${Framed.version}.`
);

//#endregion

//#region Sets up loggers

import { TypeORMLogger } from "./logger/TypeORMLogger";
import Colors from "colors/safe";
import Winston from "winston";
const format = Winston.format;
const DbLogger = Winston.createLogger({
	level: process.env.TYPEORM_WINSTON_LOGGER_LEVEL,
	levels: TypeORMLogger.defaultLevels.levels,
	format: format.combine(
		format.colorize({
			colors: TypeORMLogger.defaultLevels.colors,
		}),
		format.timestamp({
			format: "HH:mm:ss",
		}),
		format.printf(info => {
			const timestamp = Colors.gray(`[${info.timestamp}]`);
			return `${timestamp} ${info.level}: ${info.message}`;
		})
	),
	transports: [new Winston.transports.Console()],
});

//#endregion

Logger.info(`Loaded imports (${Framed.Utils.hrTimeElapsed(startTime)}s).`);
// Initializes Client
const client = new Framed.Client({
	defaultConnection: {
		type: "sqlite",
		enableWAL: true,
		database: `${__dirname}${path.sep}..${path.sep}data${path.sep}FramedDB.sqlite`,
		synchronize:
			process.env.TYPEORM_SYNCHRONIZE?.toLocaleLowerCase() == "true",
		dropSchema:
			process.env.TYPEORM_DROP_SCHEMA?.toLocaleLowerCase() == "true",
		logger: new TypeORMLogger(DbLogger, "all"),
		entities: [Framed.DatabaseManager.defaultEntitiesPath],
	},
	defaultPrefix: process.env.DEFAULT_PREFIX,
	appVersion: appVersion,
});

// Load plugins
client.plugins.loadPluginsIn({
	dirname: path.join(__dirname, "plugins"),
	filter: /^(.+plugin)\.(js|ts)$/,
	excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)$/,
});

Logger.info(
	`Loaded custom plugins (${Framed.Utils.hrTimeElapsed(startTime)}s).`
);

// Login
client
	.login([
		{
			type: "discord",
			discord: {
				token: process.env.DISCORD_TOKEN,
			},
		},
	])
	.then(() => {
		Logger.info(
			`Done (${Framed.Utils.hrTimeElapsed(startTime)}s)! Framed.js v${
				Framed.version
			} has been loaded.`
		);

		try {
			client.discord.client
				?.generateInvite({
					permissions: [
						// Likely required for most bots
						"SEND_MESSAGES",

						// Used in help command, but also allows the potential to use emojis from other servers
						"USE_EXTERNAL_EMOJIS",

						// Used for getting old messages with polls, after a restart
						"READ_MESSAGE_HISTORY",

						// Reactions and embeds needed for polls
						// Manage message is for the "once" poll option
						"ADD_REACTIONS",
						"MANAGE_MESSAGES",
						"EMBED_LINKS",

						// Extra permissions for just-in-case
						"VIEW_CHANNEL",
					],
				})
				.then(link =>
					Logger.info(`Generated bot invite link:\n${link}`)
				)
				.catch(Logger.error);
		} catch (error) {
			Logger.error(error.stack);
		}
	});
