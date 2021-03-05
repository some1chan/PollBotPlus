import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	EmbedHelper,
	Logger,
	Utils,
	version as backEndVersion,
	FriendlyError,
} from "@framedjs/core";
import { oneLine, stripIndent } from "common-tags";
import { CustomClient } from "../../../structures/CustomClient";
import os from "os";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "botstats",
			aliases: ["bot", "uptime", "botinfo", "ver", "version", "versions"],
			about: "Get bot stats, including versions and uptime.",
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (!(this.client instanceof CustomClient)) {
			Logger.error(
				"CustomClient is needed! This code needs a reference to DatabaseManager"
			);
			throw new FriendlyError(
				oneLine`The bot wasn't configured correctly!
				Contact one of the developers about this issue.`
			);
		}

		// For debugging
		// eslint-disable-next-line prefer-const
		let uptime = process.uptime();
		// uptime = 216120;

		// The rest of the data
		const osArch = `${os.platform()}/${os.arch()}`;
		const nodeEnvironment = process.env.NODE_ENV;
		const uptimeText = this.secondsToDhms(uptime);
		const ramUsage = process.memoryUsage().rss / 1024 / 1024;
		const ramUsageText = `${Number(ramUsage).toFixed(1)}`;
		const backEnd = backEndVersion ? `v${backEndVersion}` : "???";
		const botVersion = `${
			msg.client.appVersion ? `v${msg.client.appVersion}` : "???"
		}`;

		if (msg.discord) {
			const codeblock = "```";
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, this.id)
			).setTitle("Bot Stats").setDescription(stripIndent`
				${codeblock}yml
				Server:
				- OS/Arch:      ${osArch}
				- Environment:  ${nodeEnvironment}
				${codeblock}${codeblock}yml
				Framed.js Bot:
				- Uptime:       ${uptimeText}
				- RAM Usage:    ${ramUsageText} MiB
				- Back-End:     ${backEnd}
				- Bot Version:  ${botVersion}
				${codeblock}
				`);
			await msg.discord.channel.send(embed);
			return true;
		} else {
			if (msg.command != "uptime") {
				await msg.send(`Bot ${botVersion} running Framed ${backEnd}`);
				return true;
			}
		}
		return false;
	}

	private secondsToDhms(seconds: number): string {
		seconds = Number(seconds);
		const d = Math.floor(seconds / (3600 * 24));
		const h = Math.floor((seconds % (3600 * 24)) / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);

		const dDisplay = d > 0 ? `${d}d ` : "";
		const hDisplay = h > 0 ? `${h}hr ` : "";
		const mDisplay = m > 0 ? `${m}m ` : "";
		const sDisplay = s > 0 ? `${s}s ` : "";

		return `${dDisplay}${hDisplay}${mDisplay}${sDisplay}`;
		// return dDisplay + hDisplay + mDisplay + sDisplay;
	}
}
