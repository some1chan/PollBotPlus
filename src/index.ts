import { Logger } from "@framedjs/core";
import { ShardingManager } from "discord.js";
import AutoPoster from "topgg-autoposter";
import path from "path";

console.log("Starting sharder...");

const manager = new ShardingManager(`${__dirname}${path.sep}Bot.js`, {
	token: process.env.DISCORD_TOKEN,
});

if (process.env.TOP_GG_TOKEN) {
	if (process.env.TOP_GG_SHARDING?.toLocaleLowerCase() == "true") {
		Logger.info("Found top.gg token! Will try to auto-post stats.");

		const poster = AutoPoster(process.env.TOP_GG_TOKEN, manager);
		poster.on("posted", () => {
			// Ran when succesfully posted
			Logger.info("Posted stats to top.gg");
		});
	}
} else {
	Logger.warn("Couldn't find top.gg token!");
}

manager.on("shardCreate", shard => console.log(`Launched shard ${shard.id}`));
manager.spawn();
