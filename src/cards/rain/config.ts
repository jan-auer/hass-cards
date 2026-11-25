import type { ActionConfig, LovelaceCardConfig } from "../../ha/types";

/** One line on the right: an entity's total, named after the entity unless `name` is set. */
export interface RainRow {
	entity: string;
	name?: string;
}

/** `rain-card` config after defaults. Only `today` is required; missing others show "–". */
export interface RainConfig {
	/** Rain rate (mm/h); raining = rate > 0. */
	rate?: string;
	/** Rain state binary sensor; only for "Regnet seit". */
	raining?: string;
	/** Daily total (state_class total_increasing, resets daily): big value, today's bar, the 14-day stats. */
	today: string;
	/** The totals listed on the right (event, 24 h, week, month …). */
	rows: RainRow[];
	tap_action: ActionConfig;
}

/** Example entities; `getStubConfig` writes them so the card picker shows a complete config. */
export const STUB_CONFIG = {
	today: "sensor.rain_today",
	rate: "sensor.rain_rate",
	raining: "binary_sensor.rain",
	rows: [
		{ entity: "sensor.rain_event", name: "Ereignis" },
		{ entity: "sensor.rain_24h", name: "24 h" },
		{ entity: "sensor.rain_week", name: "Woche" },
		{ entity: "sensor.rain_month", name: "Monat" },
	],
};

function readRow(raw: unknown, index: number): RainRow {
	const row = (raw ?? {}) as Record<string, unknown>;
	if (typeof row.entity !== "string" || !row.entity)
		throw new Error(`rain-card: Zeile ${index + 1}: "entity" fehlt`);
	return {
		entity: row.entity,
		...(typeof row.name === "string" && row.name ? { name: row.name } : {}),
	};
}

/** Validate a user config. Throws only when the card can't render, so HA shows its error card. */
export function normalizeConfig(config: LovelaceCardConfig): RainConfig {
	if (typeof config.today !== "string" || !config.today)
		throw new Error('rain-card: "today" fehlt');
	if (config.rows !== undefined && !Array.isArray(config.rows))
		throw new Error('rain-card: "rows" muss eine Liste sein');
	const text = (key: string) =>
		typeof config[key] === "string" && config[key] !== ""
			? (config[key] as string)
			: undefined;
	return {
		rate: text("rate"),
		raining: text("raining"),
		today: config.today,
		rows: ((config.rows as unknown[] | undefined) ?? []).map(readRow),
		tap_action: (config.tap_action as ActionConfig | undefined) ?? {
			action: "more-info",
		},
	};
}

export function watchedEntities(config: RainConfig): string[] {
	return [
		config.rate,
		config.raining,
		config.today,
		...config.rows.map((row) => row.entity),
	].filter((id): id is string => id !== undefined);
}

const LABELS: Record<string, string> = {
	today: "Regen heute",
	rate: "Regenrate",
	raining: "Regen-Sensor",
	rows: "Zeilen rechts",
	tap_action: "Beim Tippen",
};

const HELPERS: Record<string, string> = {
	today:
		"Die Tagessumme, die um Mitternacht neu beginnt. Daraus kommen der große Wert, die Balken und „zuletzt“.",
	rate: "Solange es mehr als null ist, zeigt die Karte „regnet“.",
	raining: "Nur für „Regnet seit“.",
	rows: "Name leer: der Name der Entität.",
};

/** HA renders this with its own form; every option has a German label. */
export const configForm = {
	schema: [
		{
			name: "today",
			required: true,
			selector: { entity: { domain: "sensor" } },
		},
		{
			type: "grid",
			name: "",
			schema: [
				{ name: "rate", selector: { entity: { domain: "sensor" } } },
				{ name: "raining", selector: { entity: { domain: "binary_sensor" } } },
			],
		},
		{
			name: "rows",
			selector: {
				object: {
					multiple: true,
					label_field: "name",
					description_field: "entity",
					fields: {
						entity: {
							label: "Entität",
							required: true,
							selector: { entity: { domain: "sensor" } },
						},
						name: { label: "Name", selector: { text: {} } },
					},
				},
			},
		},
		{ name: "tap_action", selector: { ui_action: {} } },
	],
	computeLabel: (field: { name: string }) => LABELS[field.name],
	computeHelper: (field: { name: string }) => HELPERS[field.name],
	assertConfig: (config: LovelaceCardConfig) => {
		normalizeConfig(config);
	},
};
