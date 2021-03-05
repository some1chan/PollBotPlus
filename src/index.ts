import { Logger } from "@framedjs/core";
import { ShardingManager } from "discord.js";
import AutoPoster from "topgg-autoposter";
import path from "path";

if (process.env.TOP_GG_TOKEN) {
	const poster = AutoPoster(process.env.TOP_GG_TOKEN, ShardingManager);
	poster.on("posted", () => {
		// Ran when succesfully posted
		Logger.debug("Posted stats to top.gg");
	});
}

const manager = new ShardingManager(`${__dirname}${path.sep}Bot.js`, {
	token: process.env.DISCORD_TOKEN,
});

manager.on("shardCreate", shard => console.log(`Launched shard ${shard.id}`));
manager.spawn();
