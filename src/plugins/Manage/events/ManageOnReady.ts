import {
	BaseEvent,
	BaseMessage,
	BasePlugin,
	Discord,
	Logger,
	Place,
} from "@framedjs/core";
import Schedule from "node-schedule";

export default class extends BaseEvent {
	presences: Discord.PresenceData[] = [];
	job: Schedule.Job | undefined;
	presenceIndex = 0;
	cron = "*/30 * * * * *";

	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "manageReady",
			discord: {
				name: "ready",
			},
		});
	}

	async init(): Promise<void> {
		// Hacky workaround to always run on Discord ready, since the ready event
		// might have already happened before initializing
		super.init();

		await this.build();
		if (!this.job) {
			// Sets up the job
			this.job = Schedule.scheduleJob(this.cron, () =>
				this.setPresence()
			);

			// Then runs it immediately for start-up
			this.setPresence();
		} else {
			Logger.warn(
				`Event "${this.discord?.name}" from ${this.plugin.id} already has its job running!`
			);
		}
	}

	async run(): Promise<void> {
		// Filler function, so no errors show up
		return;
	}

	async build(): Promise<void> {
		const place: Place = {
			id: "default",
			platform: "discord",
		};

		const help = await BaseMessage.format(
			`$(command default.bot.info help) | `,
			this.client,
			place
		);

		const invite = await BaseMessage.format(
			`$(command invite) | `,
			this.client,
			place
		);
		const support = await BaseMessage.format(
			`$(command support) | `,
			this.client,
			place
		);
		const vote = await BaseMessage.format(
			`$(command vote) | `,
			this.client,
			place
		);

		this.presences.push(
			{
				activity: {
					type: "PLAYING",
					name: `${help}@PollBotPlus`,
				},
			},
			{
				activity: {
					type: "PLAYING",
					name: `${invite}@PollBotPlus`,
				},
			},
			{
				activity: {
					type: "PLAYING",
					name: `${help}@PollBotPlus`,
				},
			},
			{
				activity: {
					type: "PLAYING",
					name: `${vote}@PollBotPlus`,
				},
			},
			{
				activity: {
					type: "PLAYING",
					name: `${help}@PollBotPlus`,
				},
			},
			{
				activity: {
					type: "PLAYING",
					name: `${support}@PollBotPlus`,
				},
			}
		);
	}

	async setPresence(presenceIndex = this.presenceIndex): Promise<void> {
		if (this.discord) {
			try {
				Logger.silly(
					`Setting activity to "${this.presences[presenceIndex].activity?.name}"`
				);
				await this.discord.client?.user?.setPresence(
					this.presences[presenceIndex]
				);
			} catch (error) {
				Logger.error(error.stack);
			}

			// Increments number
			this.presenceIndex = (presenceIndex + 1) % this.presences.length;
		}
	}
}
