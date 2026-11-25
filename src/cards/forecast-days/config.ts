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
