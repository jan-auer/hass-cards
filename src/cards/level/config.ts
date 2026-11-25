import { decimal } from "../../ha/format";
import type {
	ActionConfig,
	EntityName,
	LovelaceCardConfig,
} from "../../ha/types";

/**
 * `level-card` config after defaults. The level word comes from the active level's `word`; a level without one
 * shows `suffix` in neutral grey instead (an index on a fixed scale: "1 von 5").
 *
 * UV:
 *   type: custom:level-card
 *   entity: sensor.uv_index
 *   name: UV-Index
 *   icon: mdi:weather-sunny
 *   max: 11
 *   levels:
 *     - { from: 0, word: niedrig, color: "#34C759" }
 *     - { from: 3, word: mäßig, color: "#FFCC00" }
 *     - { from: 6, word: hoch, color: "#FF9500" }
 *     - { from: 8, word: sehr hoch, color: "#FF3B30" }
 *     - { from: 11, word: extrem, color: "#AF52DE" }
 *
 * Air quality (GeoSphere index 1–5; the state is a number string):
 *   type: custom:level-card
 *   entity: sensor.zuhause_luftqualitatsindex
 *   name: Luftqualitätsindex
 *   icon: mdi:leaf
 *   min: 1
 *   max: 5
 *   suffix: von 5
 *   levels:
 *     - { from: 1, color: "#34C759" }
 *     - { from: 2, color: "#A8D84E" }
 *     - { from: 3, color: "#FFCC00" }
 *     - { from: 4, color: "#FF9500" }
 *     - { from: 5, color: "#FF3B30" }
 */
export interface LevelConfig {
	entity: string;
	/** Text, or HA name items (`{type: entity}` …) passed to hass.formatEntityName. */
	name?: EntityName;
	icon?: string;
	/** Sorted ascending by `from`. */
	levels: Level[];
	min: number;
	max: number;
	/** Neutral text after the value when the active level has no word. */
	suffix?: string;
	/** Labels under the band: left (default min), middle (ellipsized, default none), right (default max with a +). */
	start_label: string;
	middle_label?: string;
	end_label: string;
	tap_action: ActionConfig;
}

export interface Level {
	from: number;
	word?: string;
	color: string;
}

export function normalizeConfig(config: LovelaceCardConfig): LevelConfig {
	const fail = (what: string) => new Error(`level-card: ${what}`);
	if (typeof config.entity !== "string" || !config.entity)
		throw fail("`entity` fehlt");
	if (!Array.isArray(config.levels) || !config.levels.length)
		throw fail("`levels` fehlt");
	const levels = (config.levels as Record<string, unknown>[])
		.map((level) => ({
			from: Number(level.from),
			word: typeof level.word === "string" ? level.word : undefined,
			color: String(level.color ?? ""),
		}))
		.sort((a, b) => a.from - b.from);
	if (levels.some((level) => !Number.isFinite(level.from) || !level.color))
		throw fail("jede Stufe braucht `from` und `color`");
	const max = Number(config.max);
	if (config.max === undefined || !Number.isFinite(max))
		throw fail("`max` fehlt");
	const min = config.min === undefined ? levels[0].from : Number(config.min);
	if (!Number.isFinite(min) || min >= max) throw fail("`min` < `max` nötig");
	const text = (key: string) =>
		typeof config[key] === "string" && config[key] !== ""
			? (config[key] as string)
			: undefined;
	const label = (key: string) =>
		typeof config[key] === "string" || typeof config[key] === "number"
			? String(config[key]) || undefined
			: undefined;
	return {
		entity: config.entity,
		name:
			typeof config.name === "object" && config.name !== null
				? (config.name as EntityName)
				: text("name"),
		icon: text("icon"),
		levels,
		min,
		max,
		suffix: text("suffix"),
		start_label: label("start_label") ?? String(min),
		middle_label: label("middle_label"),
		end_label: label("end_label") ?? `${max}+`,
		tap_action: (config.tap_action as ActionConfig | undefined) ?? {
			action: "more-info",
		},
	};
}

/** The last level whose `from` is at or below the value; below the scale the first. */
export function activeLevel(config: LevelConfig, value: number): Level {
	return (
		config.levels.filter((level) => level.from <= value).at(-1) ??
		config.levels[0]
	);
}

/** The value's place on the band, 0…1. */
export function dotPosition(config: LevelConfig, value: number): number {
	const position = (value - config.min) / (config.max - config.min);
	return Math.min(1, Math.max(0, position));
}

/** The band: each level's colour at its `from` on min…max. */
export function bandGradient(config: LevelConfig): string {
	const stops = config.levels.map(
		(level) =>
			`${level.color} ${Math.round(dotPosition(config, level.from) * 100)}%`,
	);
	return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/** Integers as integers, everything else with one decimal. */
export function valueText(value: number, language: string): string {
	return decimal(value, Number.isInteger(value) ? 0 : 1, language);
}

type FormField = { name: string };

const LABELS: Record<string, string> = {
	entity: "Sensor",
	name: "Name",
	icon: "Symbol",
	min: "Skala von",
	max: "Skala bis",
	suffix: "Text nach dem Wert",
	start_label: "Beschriftung links",
	middle_label: "Mitte",
	end_label: "Rechts",
	levels: "Stufen",
	tap_action: "Beim Tippen",
};

const HELPERS: Record<string, string> = {
	min: "Leer: die erste Stufe.",
	suffix: "Nur für Stufen ohne Wort, z. B. von 5.",
	start_label: "Leer: Anfang der Skala.",
	end_label: "Leer: Ende der Skala mit +.",
};

/** HA renders this with its own form; every option has a German label. */
export const configForm = {
	schema: [
		{ name: "entity", required: true, selector: { entity: {} } },
		{
			name: "name",
			selector: { entity_name: {} },
			context: { entity: "entity" },
		},
		{
			name: "icon",
			selector: { icon: {} },
			context: { icon_entity: "entity" },
		},
		{
			type: "grid",
			name: "",
			schema: [
				{ name: "min", selector: { number: { mode: "box", step: "any" } } },
				{
					name: "max",
					required: true,
					selector: { number: { mode: "box", step: "any" } },
				},
			],
		},
		{
			name: "levels",
			required: true,
			selector: {
				object: {
					multiple: true,
					label_field: "word",
					description_field: "from",
					fields: {
						from: {
							label: "Ab",
							required: true,
							selector: { number: { mode: "box", step: "any" } },
						},
						word: { label: "Wort", selector: { text: {} } },
						color: {
							label: "Farbe",
							required: true,
							selector: { text: { type: "color" } },
						},
					},
				},
			},
		},
		{ name: "suffix", selector: { text: {} } },
		{
			type: "grid",
			name: "",
			column_min_width: "80px",
			schema: [
				{ name: "start_label", selector: { text: {} } },
				{ name: "middle_label", selector: { text: {} } },
				{ name: "end_label", selector: { text: {} } },
			],
		},
		{ name: "tap_action", selector: { ui_action: {} } },
	],
	computeLabel: (field: FormField) => LABELS[field.name],
	computeHelper: (field: FormField) => HELPERS[field.name],
	assertConfig: (config: LovelaceCardConfig) => {
		normalizeConfig(config);
	},
};
