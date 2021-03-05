import { BaseProvider, Logger, PrefixProvider } from "@framedjs/core";
import * as TypeORM from "typeorm";
import Prefix from "../database/entities/Prefix";
import util from "util";

export class TypeORMPrefixProvider extends PrefixProvider {
	prefixRepo: TypeORM.Repository<Prefix>;

	constructor(
		baseProvider: BaseProvider,
		prefixRepo: TypeORM.Repository<Prefix>
	) {
		super(baseProvider);

		this.prefixRepo = prefixRepo;
	}

	async init(): Promise<void> {
		// Fills up the cache with database values
		const prefixes = await this.prefixRepo.find();
		for await (const prefix of prefixes) {
			await super.set(prefix.placeId, prefix.prefix, prefix.prefixId);
		}
		Logger.silly(`init: ${util.inspect(this.array)}`);

		// Initializes any other things that need to be added to cache
		await super.init();
	}

	/**
	 * Gets the prefix.
	 *
	 * @param placeId Place ID
	 * @param id Prefix ID. Defaults to "default"
	 */
	get(placeId: string, id = "default"): string | undefined {
		return super.get(placeId, id);
	}

	/**
	 * Sets the guild or Twitch channel ID's prefix.
	 *
	 * @param placeId Place ID
	 * @param prefix The prefix.
	 * @param prefixId Prefix ID. Defaults to "default"
	 */
	async set(
		placeId: string,
		prefix: string,
		prefixId = "default",
	): Promise<Map<string, Map<string, string>>> {
		Logger.silly(`set: ${util.inspect(this.array)}`);

		await this.prefixRepo.save(
			this.prefixRepo.create({
				prefixId: prefixId,
				placeId: placeId,
				prefix: prefix,
			})
		);
		const a = await super.set(placeId, prefix, prefixId);
		Logger.silly(`set: ${util.inspect(this.array)}`);
		return a;
	}

	/**
	 * Deletes the place's prefixes
	 *
	 * @param placeId Place ID
	 */
	async delete(placeId: string): Promise<boolean> {
		await this.prefixRepo.delete(placeId);
		return super.delete(placeId);
	}
}
