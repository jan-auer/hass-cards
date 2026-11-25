import type { LovelaceCardConfig } from "../../ha/types";

/** One pill: `name` is shown (defaults to the value), `value` is what `show_for` lists. */
export interface FilterItem {
	type: "item";
	name: string;
	value: string;
	icon?: string;
}

/** A thin divider between pills (`{type: separator}`). */
export interface FilterSeparator {
	type: "separator";
}

export type FilterBarEntry = FilterItem | FilterSeparator;

export interface FilterBarConfig {
	/** Links the bar to the `filter-section` cards on the page. */
	group: string;
	entries: FilterBarEntry[];
	/** The value while no pill is selected (every new visit, or after tapping the selected pill again).
	 * `default` in the config; without it, the first item's value. */
	default: string;
}

export interface FilterSectionConfig {
	group: string;
	/** The bar values that show this section's cards. */
	show_for: string[];
	cards: LovelaceCardConfig[];
}

const isText = (value: unknown): value is string | number =>
	(typeof value === "string" && value !== "") || typeof value === "number";

function readGroup(config: LovelaceCardConfig): string {
	if (typeof config.group !== "string" || !config.group)
		throw new Error('"group" fehlt');
	return config.group;
}

function readEntry(raw: unknown, index: number): FilterBarEntry {
	const entry = (raw ?? {}) as Record<string, unknown>;
	if (entry.type === "separator") return { type: "separator" };
	if (!isText(entry.value))
		throw new Error(`Eintrag ${index + 1}: "value" fehlt`);
	const value = String(entry.value);
	return {
		type: "item",
		name: isText(entry.name) ? String(entry.name) : value,
		value,
		...(typeof entry.icon === "string" && entry.icon
			? { icon: entry.icon }
			: {}),
	};
}

/** Validate a `filter-bar` config. Throws only when the bar can't work, so HA shows its error card. */
export function parseBarConfig(config: LovelaceCardConfig): FilterBarConfig {
	const group = readGroup(config);
	if (!Array.isArray(config.items)) throw new Error('"items" fehlt');
	const entries = config.items.map(readEntry);
	const first = entries.find((entry) => entry.type === "item");
	if (!first) throw new Error('"items" braucht mindestens einen Eintrag');
	return {
		group,
		entries,
		default: isText(config.default) ? String(config.default) : first.value,
	};
}

/** Validate a `filter-section` config. `show_for` may be a single value. */
export function parseSectionConfig(
	config: LovelaceCardConfig,
): FilterSectionConfig {
	const group = readGroup(config);
	const raw = config.show_for;
	const values = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
	if (!values.every(isText))
		throw new Error('"show_for" muss eine Liste von Werten sein');
	const cards = config.cards ?? [];
	if (!Array.isArray(cards)) throw new Error('"cards" muss eine Liste sein');
	cards.forEach((card, index) => {
		if (typeof (card as LovelaceCardConfig | null)?.type !== "string")
			throw new Error(`Karte ${index + 1}: "type" fehlt`);
	});
	return {
		group,
		show_for: values.map(String),
		cards: cards as LovelaceCardConfig[],
	};
}
