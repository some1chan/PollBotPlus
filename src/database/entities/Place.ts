import { Platform } from "@framedjs/core";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export default class Place {
	@PrimaryColumn()
	platformId!: string;

	@PrimaryColumn({ type: "text" })
	platform!: Platform;

	@Column()
	placeId!: string;
}
