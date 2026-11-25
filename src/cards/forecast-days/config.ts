import type { ActionConfig, LovelaceCardConfig } from "../../ha/types";

/** `forecast-days-card` config after defaults. */
export interface ForecastDaysConfig {
	entity: string;
	/** How many days to show; all the entity provides when left out. */
	days?: number;
	/** The current temperature, drawn as a dot on today's bar. */
	temperature?: string;
	tap_action: ActionConfig;
}

export function normalizeConfig(
	config: LovelaceCardConfig,
): ForecastDaysConfig {
	if (typeof config.entity !== "string" || !config.entity)
		throw new Error("forecast-days-card: `entity` fehlt");
	const days = Number(config.days);
	return {
		entity: config.entity,
		days:
			config.days !== undefined && Number.isInteger(days) && days > 0
				? days
				: undefined,
		temperature:
			typeof config.temperature === "string" && config.temperature
				? config.temperature
				: undefined,
		tap_action: (config.tap_action as ActionConfig | undefined) ?? {
			action: "more-info",
		},
	};
}

const LABELS: Record<string, string> = {
	entity: "Wettervorhersage",
	days: "Tage",
	temperature: "Aktuelle Temperatur",
	tap_action: "Beim Tippen",
};

const HELPERS: Record<string, string> = {
	days: "Leer: alle Tage der Vorhersage.",
	temperature: "Als Punkt auf dem Balken von heute.",
};

/** HA renders this with its own form; every option has a German label. */
export const configForm = {
	schema: [
		{
			name: "entity",
			required: true,
			selector: { entity: { domain: "weather" } },
		},
		{
			type: "grid",
			name: "",
			schema: [
				{
					name: "days",
					selector: { number: { min: 1, max: 15, mode: "box" } },
				},
				{ name: "temperature", selector: { entity: { domain: "sensor" } } },
			],
		},
		{ name: "tap_action", selector: { ui_action: {} } },
	],
	computeLabel: (field: { name: string }) => LABELS[field.name],
	computeHelper: (field: { name: string }) => HELPERS[field.name],
	assertConfig: (config: LovelaceCardConfig) => {
		normalizeConfig(config);
	},
};
