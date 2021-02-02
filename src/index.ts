import { ShardingManager } from "discord.js";
import path from "path";

const manager = new ShardingManager(`${__dirname}${path.sep}Bot.js`, {
	token: process.env.DISCORD_TOKEN,
});

manager.on("shardCreate", shard => console.log(`Launched shard ${shard.id}`));
manager.spawn();
