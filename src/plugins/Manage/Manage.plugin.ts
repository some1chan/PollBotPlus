import { BasePlugin, Client } from "@framedjs/core";
import path from "path";

export default class Manage extends BasePlugin {
	constructor(client: Client) {
		super(client, {
			id: "default.bot.manage",
			name: "Manage",
			description: "Manages certain things, such as commands.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				events: path.join(__dirname, "events"),
			},
			groupEmote: ":pencil2:",
			groupName: "Manage",
		});
	}
}
