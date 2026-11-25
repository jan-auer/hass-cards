import type { ActionConfig, LovelaceCardConfig } from "../../ha/types";

/** `rain-card` config after defaults. Only `today` is required; missing others show "–". */
export interface RainConfig {
	/** Rain rate (mm/h); raining = rate > 0. */
	rate?: string;
	/** Rain state binary sensor; only for "Regnet seit". */
	raining?: string;
	/** Event total. */
	event?: string;
	/** Daily total (state_class total_increasing, resets daily): big value, today's bar, the 14-day stats. */
	today: string;
	last_24h?: string;
	week?: string;
	month?: string;
	year?: string;
	tap_action: ActionConfig;
}

const ENTITY_KEYS = [
	"rate",
	"raining",
	"event",
	"today",
	"last_24h",
	"week",
	"month",
	"year",
] as const;

/** Example entities; `getStubConfig` writes them so the card picker shows a complete config. */
export const STUB_CONFIG: Record<(typeof ENTITY_KEYS)[number], string> = {
	rate: "sensor.rain_rate",
	raining: "binary_sensor.rain",
	event: "sensor.rain_event",
	today: "sensor.rain_today",
	last_24h: "sensor.rain_24h",
	week: "sensor.rain_week",
	month: "sensor.rain_month",
	year: "sensor.rain_year",
};

/** Validate a user config. Throws only when the card can't render, so HA shows its error card. */
export function normalizeConfig(config: LovelaceCardConfig): RainConfig {
	if (typeof config.today !== "string" || !config.today)
		throw new Error('rain-card: "today" fehlt');
	const text = (key: string) =>
		typeof config[key] === "string" && config[key] !== ""
			? (config[key] as string)
			: undefined;
	return {
		rate: text("rate"),
		raining: text("raining"),
		event: text("event"),
		today: config.today,
		last_24h: text("last_24h"),
		week: text("week"),
		month: text("month"),
		year: text("year"),
		tap_action: (config.tap_action as ActionConfig | undefined) ?? {
			action: "more-info",
		},
	};
}

export function watchedEntities(config: RainConfig): string[] {
	return ENTITY_KEYS.map((key) => config[key]).filter(
		(id): id is string => id !== undefined,
	);
}

const LABELS: Record<string, string> = {
	rate: "Regenrate",
	raining: "Regen-Sensor",
	event: "Ereignis",
	today: "Regen heute",
	last_24h: "24 h",
	week: "Woche",
	month: "Monat",
	year: "Jahr",
	tap_action: "Beim Tippen",
};

/** HA renders this with its own form; every option has a German label. */
export const configForm = {
	schema: [
		{
			type: "grid",
			name: "",
			schema: ENTITY_KEYS.map((name) => ({
				name,
				required: name === "today",
				selector: {
					entity: { domain: name === "raining" ? "binary_sensor" : "sensor" },
				},
			})),
		},
		{ name: "tap_action", selector: { ui_action: {} } },
	],
	computeLabel: (field: { name: string }) => LABELS[field.name],
	assertConfig: (config: LovelaceCardConfig) => {
		normalizeConfig(config);
	},
};
