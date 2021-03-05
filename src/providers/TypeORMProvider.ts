import { BaseProvider, Client } from "@framedjs/core";
import * as TypeORM from "typeorm";
import { TypeORMPlaceProvider } from "./TypeORMPlaceProvider";
import { TypeORMPrefixProvider } from "./TypeORMPrefixProvider";
import { TypeORMSettingsProvider } from "./TypeORMSettingsProvider";
import Place from "../database/entities/Place";
import Plugin from "../database/entities/Plugin";
import Prefix from "../database/entities/Prefix";
import Settings from "../database/entities/Settings";
import { DatabaseManager } from "../managers/DatabaseManager";
import { TypeORMPluginProvider } from "./TypeORMPluginProvider";

export class TypeORMProvider extends BaseProvider {
	connectionName?: string;

	constructor(client: Client, connectionName?: string) {
		super(client);
		this.connectionName = connectionName;
	}

	async init(): Promise<void> {
		const connection = TypeORM.getConnection(this.connectionName);
		if (!connection) {
			throw new ReferenceError(DatabaseManager.errorNotFound);
		}

		// Overrides defaults
		this.places = new TypeORMPlaceProvider(
			this,
			connection.getRepository(Place)
		);

		this.plugins = new TypeORMPluginProvider(
			this,
			connection.getRepository(Plugin)
		);

		this.prefixes = new TypeORMPrefixProvider(
			this,
			connection.getRepository(Prefix)
		);

		this.settings = new TypeORMSettingsProvider(
			this,
			connection.getRepository(Settings)
		);

		// Runs the init for all the subproviders
		await super.init(true);
	}
}
