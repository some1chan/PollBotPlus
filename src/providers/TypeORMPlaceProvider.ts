import { BaseProvider, Place, PlaceProvider, Platform } from "@framedjs/core";
import * as TypeORM from "typeorm";
import { default as PlaceEntity } from "../database/entities/Place";

export class TypeORMPlaceProvider extends PlaceProvider {
	placeRepo: TypeORM.Repository<PlaceEntity>;

	constructor(
		baseProvider: BaseProvider,
		placeRepo: TypeORM.Repository<PlaceEntity>
	) {
		super(baseProvider);
		this.placeRepo = placeRepo;
	}

	async init(): Promise<void> {
		// Fills up the cache with database values
		const places = await this.placeRepo.find();
		for await (const place of places) {
			await super.set(place.platformId, place.platform, place.placeId);
		}

		// Initializes any other things that need to be added to cache
		await super.init();
	}

	/**
	 * Gets the place data.
	 *
	 * @param id Guild or Twitch channel ID
	 */
	get(id: string): Place | undefined {
		return super.get(id);
	}

	/**
	 * Sets the guild or Twitch channel ID's place ID.
	 *
	 * @param platformId Guild or Twitch channel ID
	 * @param placeId The place ID to attach that guild or twitch channel to
	 */
	async set(
		platformId: string,
		platform: Platform,
		placeId: string
	): Promise<Map<string, Place>> {
		await this.placeRepo.save(
			this.placeRepo.create({
				platformId: platformId,
				platform: platform,
				placeId: placeId,
			})
		);
		return super.set(platformId, platform, placeId);
	}

	/**
	 * Deletes the guild or Twitch channel ID's place entry by ID
	 *
	 * @param id Guild or Twitch channel ID
	 */
	async delete(id: string): Promise<boolean> {
		await this.placeRepo.delete(id);
		return super.delete(id);
	}
}
