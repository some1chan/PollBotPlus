import { BaseProvider, PluginProvider, Logger, Settings } from "@framedjs/core";
import * as TypeORM from "typeorm";
import Plugin from "../database/entities/Plugin";

export class TypeORMPluginProvider extends PluginProvider {
	pluginRepo: TypeORM.Repository<Plugin>;

	constructor(
		baseProvider: BaseProvider,
		pluginRepo: TypeORM.Repository<Plugin>
	) {
		super(baseProvider);
		this.pluginRepo = pluginRepo;
	}

	async init(): Promise<void> {
		// Fills the cache with empty data
		await super.init(false);

		// Finds all existing plugin entries
		const dbPlugins = await this.pluginRepo.find();

		// Adds an entry for all new plugins
		const pluginsToSave: TypeORM.DeepPartial<Plugin>[] = [];
		for (const plugin of this.client.plugins.pluginsArray) {
			if (!dbPlugins.find(dbPlugin => dbPlugin.id == plugin.id)) {
				// Pushes into an array to create the plugin
				pluginsToSave.push({
					id: plugin.id,
					data: {},
				});
			}
		}
		await this.pluginRepo.save(pluginsToSave);

		// Handles installs and post installs for all new plugins
		const installs: Promise<void>[] = [];
		const postInstalls: Promise<void>[] = [];

		// Handles installs for new plugins
		for (const plugin of this.client.plugins.pluginsArray) {
			if (!dbPlugins.find(dbPlugin => dbPlugin.id == plugin.id)) {
				if (plugin.install) {
					installs.push(plugin.install());
				}
			}
		}
		const installSettled = await Promise.allSettled(installs);
		for (const settled of installSettled) {
			if (settled.status == "rejected") {
				Logger.error(settled.reason);
			}
		}

		// Handles post installs for new plugins
		for (const plugin of this.client.plugins.pluginsArray) {
			if (!dbPlugins.find(dbPlugin => dbPlugin.id == plugin.id)) {
				if (plugin.postInstall) {
					postInstalls.push(plugin.postInstall());
				}
			}
		}
		const postInstallSettled = await Promise.allSettled(postInstalls);
		for (const settled of postInstallSettled) {
			if (settled.status == "rejected") {
				Logger.error(settled.reason);
			}
		}

		// Fills the cache with actual data now
		for (const plugin of await this.pluginRepo.find()) {
			this.cache.set(plugin.id, plugin.data);
		}
	}

	/**
	 * Sets a key's value
	 *
	 * @param key
	 * @param value
	 */
	async set(
		pluginId: string,
		key: string,
		value: unknown
	): Promise<Map<string, Settings>> {
		// Gets existing settings and sets our value
		let settings = this.cache.get(pluginId) ?? {};
		settings[key] = value;

		// Saves it to the database
		await this.pluginRepo.save(
			this.pluginRepo.create({
				id: pluginId,
				data: settings,
			})
		);

		// Technically unnessesary, as we've written to the cache already
		// return super.set(pluginId, key, value);
		// We still need to return something though, so we do this;
		return this.cache;
	}
}
