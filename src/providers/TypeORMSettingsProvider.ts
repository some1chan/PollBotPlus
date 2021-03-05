import { BaseProvider, Settings, SettingsProvider } from "@framedjs/core";
import * as TypeORM from "typeorm";
import { default as SettingsEntity } from "../database/entities/Settings";

export class TypeORMSettingsProvider extends SettingsProvider {
	settingsRepo: TypeORM.Repository<SettingsEntity>;

	constructor(
		baseProvider: BaseProvider,
		settingsRepo: TypeORM.Repository<SettingsEntity>
	) {
		super(baseProvider);
		this.settingsRepo = settingsRepo;
	}

	async init(): Promise<void> {
		const settingsData = await this.settingsRepo.find();

		for await (const settings of settingsData) {
			for (const [key, value] of Object.entries(settings.settings)) {
				await super.set(settings.placeId, key, value);
			}
		}

		await super.init();
	}

	/**
	 * Gets the place data.
	 *
	 * @param placeId Guild or Twitch channel ID
	 */
	get(placeId: string): Settings | undefined {
		return super.get(placeId);
	}

	/**
	 * Sets the guild or Twitch channel ID's place ID.
	 *
	 * @param placeId Guild or Twitch channel ID
	 * @param key
	 * @param placeId The place ID to attach that guild or twitch channel to
	 */
	async set(
		placeId: string,
		key: string,
		value: unknown
	): Promise<Map<string, Settings>> {
		// Gets existing settings and sets our value
		let settings = this.cache.get(placeId) ?? {};
		settings[key] = value;

		// Saves it to the database
		await this.settingsRepo.save(
			this.settingsRepo.create({
				placeId: placeId,
				settings: settings,
			})
		);

		// Technically unnessesary, as we've written to the cache already
		// return super.set(placeId, key, value);
		// We still need to return something though, so we do this;
		return this.cache;
	}

	async delete(placeId: string): Promise<boolean> {
		await this.settingsRepo.delete(placeId);
		return super.delete(placeId);
	}
}
