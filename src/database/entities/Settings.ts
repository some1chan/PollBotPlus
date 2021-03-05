import { Column, Entity, PrimaryColumn } from "typeorm";
import { Settings as SettingsInterface } from "@framedjs/core";

@Entity()
export default class Settings {
	@PrimaryColumn()
	placeId!: string;

	@Column("simple-json")
	settings!: SettingsInterface;
}
