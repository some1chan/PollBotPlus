import { Client, ClientOptions } from "@framedjs/core";
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
}
