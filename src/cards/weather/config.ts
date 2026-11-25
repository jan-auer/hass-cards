import type { ActionConfig, LovelaceCardConfig } from "../../ha/types";
import type { LayoutSetting } from "./history";

export const LAYOUT_SETTINGS = ["auto", "half", "full"] as const;

export interface WetterConfig extends LovelaceCardConfig {
	/** `auto` follows the card's width: half below 300 px, full above. */
	layout: LayoutSetting;
	temperature: string;
	humidity?: string;
	/** Weather entity whose state is the condition (e.g. a forecast model's). */
	condition?: string;
	/** The rain sensor (watched only; raining = `rain_rate` above 0, since the piezo stays on while wet). */
	rain_state?: string;
	rain_rate?: string;
	/** Rain so far today, for the full-width layout. */
	rain_today?: string;
	/** For the partly-cloudy icon at night. */
	sun: string;
	tap_action?: ActionConfig;
}

/** Validate a user config. Throws only when the card can't render, so HA shows its error card in this slot. */
export function normalizeConfig(config: LovelaceCardConfig): WetterConfig {
	if (typeof config.temperature !== "string" || !config.temperature)
		throw new Error('"temperature" fehlt');
	const layout = config.layout ?? "auto";
	if (!(LAYOUT_SETTINGS as readonly unknown[]).includes(layout))
		throw new Error('"layout" muss auto, half oder full sein');
	return {
		...config,
		layout,
		sun: typeof config.sun === "string" ? config.sun : "sun.sun",
	} as WetterConfig;
}

export function watchedEntities(config: WetterConfig): string[] {
	return [
		config.temperature,
		config.humidity,
		config.condition,
		config.rain_state,
		config.rain_rate,
		config.rain_today,
		config.sun,
	].filter((id): id is string => typeof id === "string" && id !== "");
}

const LABELS: Record<string, string> = {
	layout: "Größe",
	temperature: "Temperatur",
	humidity: "Luftfeuchte",
	condition: "Wetterlage (Vorhersage)",
	rain_state: "Regen-Sensor",
	rain_rate: "Regenrate",
	rain_today: "Regen heute",
	sun: "Sonne",
	tap_action: "Beim Tippen",
};

/** HA renders this with its own form; every option has a German label. */
export const configForm = {
	schema: [
		{
			name: "layout",
			selector: {
				select: {
					mode: "dropdown",
					options: [
						{ value: "auto", label: "Automatisch (nach Breite)" },
						{ value: "half", label: "Halbe Breite" },
						{ value: "full", label: "Volle Breite" },
					],
				},
			},
		},
		{
			type: "grid",
			name: "",
			schema: [
				{
					name: "temperature",
					required: true,
					selector: { entity: { domain: "sensor" } },
				},
				{ name: "humidity", selector: { entity: { domain: "sensor" } } },
				{ name: "condition", selector: { entity: { domain: "weather" } } },
				{ name: "sun", selector: { entity: { domain: "sun" } } },
				{
					name: "rain_state",
					selector: { entity: { domain: "binary_sensor" } },
				},
				{ name: "rain_rate", selector: { entity: { domain: "sensor" } } },
				{ name: "rain_today", selector: { entity: { domain: "sensor" } } },
			],
		},
		{ name: "tap_action", selector: { ui_action: {} } },
	],
	computeLabel: (field: { name: string }) => LABELS[field.name],
	assertConfig: (config: LovelaceCardConfig) => {
		normalizeConfig(config);
	},
};
