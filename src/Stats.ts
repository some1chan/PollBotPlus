import { Discord, Logger } from "@framedjs/core";
import { Api as TopggApi } from "@top-gg/sdk";
import Axios from "axios";

export function autopostStats(client: Discord.Client) {
	if (process.env.TOP_GG_SHARDING?.toLocaleLowerCase() != "true") {
		if (process.env.TOP_GG_TOKEN) {
			Logger.info("Found top.gg token! Will try to auto-post stats.");

			const api = new TopggApi(process.env.TOP_GG_TOKEN);
			setInterval(async () => {
				postToTopGG(client, api);
			}, 60 * 30 * 1000); // post every 30 minutes
			postToTopGG(client, api);
		} else {
			Logger.warn("Couldn't find top.gg token!");
		}
	}

	if (process.env.DISCORDBOTLIST_TOKEN) {
		Logger.info(
			"Found discordbotlist.com token! Will try to auto-post stats."
		);
		setInterval(async () => {
			postToDiscordBotListCom(client);
		}, 60 * 30 * 1000);
		postToDiscordBotListCom(client);
	} else {
		Logger.warn("Couldn't find discordbotlist.com");
	}
}

async function postToTopGG(client: Discord.Client, api: TopggApi) {
	await api.postStats({
		serverCount: client.guilds.cache.size,
	});
	Logger.info(
		`Posted stats to top.gg - serverCount: ${client.guilds.cache.size}`
	);
}

async function postToDiscordBotListCom(client: Discord.Client) {
	try {
		await Axios.post(
			`https://discordbotlist.com/api/v1/bots/${
				process.env.DISCORD_USER_ID ?? client.user?.id
			}/stats`,
			{
				guilds: 90,
			},
			{
				headers: {
					Authorization: process.env.DISCORDBOTLIST_TOKEN,
				},
			}
		).catch(reason => {
			Logger.error(reason.response.data);
		});
		Logger.info("Posted stats to discordbotlist.com");
	} catch (error) {
		Logger.error(error.stack);
	}
}
