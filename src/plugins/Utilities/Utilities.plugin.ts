import { BasePlugin, Client } from "@framedjs/core";
import path from "path";

export default class extends BasePlugin {
	constructor(client: Client) {
		super(client, {
			id: "default.bot.utils",
			name: "Utilities",
			description: "Utility commands.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				// events: path.join(__dirname, "events"),
			},
			groupEmote: ":tools:",
			groupName: "Utilities",
		});
	}
}
