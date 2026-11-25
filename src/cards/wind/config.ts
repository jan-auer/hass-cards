import type { ActionConfig, LovelaceCardConfig } from "../../ha/types";

/** `wind-card` config after defaults. Every wind entity is required. */
export interface WindConfig {
	speed: string;
	gust: string;
	direction: string;
	/** Mean direction over the last 10 minutes. */
	direction_avg: string;
	/** Today's highest gust. */
	max_today: string;
	tap_action: ActionConfig;
}

/** Example entities; `getStubConfig` writes them so the card picker shows a complete config. */
export const STUB_ENTITIES = {
	speed: "sensor.wind_speed",
	gust: "sensor.wind_gust",
	direction: "sensor.wind_direction",
	direction_avg: "sensor.wind_direction_10m_avg",
	max_today: "sensor.wind_gust_max_today",
} as const;

/** Validate a user config. Throws only when the card can't render, so HA shows its error card. */
export function normalizeConfig(config: LovelaceCardConfig): WindConfig {
	const entity = (key: keyof typeof STUB_ENTITIES) => {
		const value = config[key];
		if (typeof value !== "string" || value === "")
			throw new Error(`wind-card: "${key}" fehlt`);
		return value;
	};
	return {
		speed: entity("speed"),
		gust: entity("gust"),
		direction: entity("direction"),
		direction_avg: entity("direction_avg"),
		max_today: entity("max_today"),
		tap_action: (config.tap_action as ActionConfig | undefined) ?? {
			action: "more-info",
		},
	};
}

const LABELS: Record<string, string> = {
	speed: "Windgeschwindigkeit",
	gust: "Böen",
	direction: "Windrichtung",
	direction_avg: "Windrichtung, 10-Minuten-Mittel",
	max_today: "Stärkste Böe heute",
	tap_action: "Beim Tippen",
};

/** HA renders this with its own form; every option has a German label. */
export const configForm = {
	schema: [
		{
			type: "grid",
			name: "",
			schema: Object.keys(STUB_ENTITIES).map((name) => ({
				name,
				required: true,
				selector: { entity: { domain: "sensor" } },
			})),
		},
		{ name: "tap_action", selector: { ui_action: {} } },
	],
	computeLabel: (field: { name: string }) => LABELS[field.name],
	assertConfig: (config: LovelaceCardConfig) => {
		normalizeConfig(config);
	},
};
