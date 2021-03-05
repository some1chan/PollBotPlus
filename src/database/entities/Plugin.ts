import { Settings } from "@framedjs/core";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export default class Plugin {
	@PrimaryColumn()
	id!: string;

	@Column({ type: "simple-json" })
	data!: Settings;
}
