import { Column, Entity, ManyToMany, OneToMany, PrimaryColumn } from "typeorm";
import Command from "./Command";

@Entity()
export default class Prefix {
	@PrimaryColumn()
	placeId!: string;

	@PrimaryColumn()
	prefixId!: string;

	@Column()
	prefix!: string;

	@OneToMany(() => Command, command => command.defaultPrefix)
	defaultCommands!: Command[];

	@ManyToMany(() => Command, command => command.prefixes)
	commands?: Command[];
}
