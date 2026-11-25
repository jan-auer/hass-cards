import type { ActionConfig, LovelaceCardConfig } from "../../ha/types";

/**
 * `upcoming-pickups-card` config after defaults. `bins` maps the entity's `termine[].art` to an icon and colour.
 *
 *   type: custom:upcoming-pickups-card
 *   entity: binary_sensor.muell_erinnerung
 *   max_rows: 3
 *   bins:
 *     - { name: Restmüll, icon: mdi:trash-can-outline, color: "#8E8E93" }
 */
export interface UpcomingPickupsConfig {
	entity: string;
	bins: Bin[];
	max_rows: number;
	tap_action: ActionConfig;
}

export interface Bin {
	name: string;
	icon: string;
	color: string;
}

export const STUB_ENTITY = "binary_sensor.muell_erinnerung";

export const DEFAULT_BINS: readonly Bin[] = [
	{ name: "Restmüll", icon: "mdi:trash-can-outline", color: "#8E8E93" },
	{ name: "Altpapier", icon: "mdi:newspaper", color: "#FF453A" },
	{ name: "Gelber Sack", icon: "mdi:recycle-variant", color: "#F5B800" },
];

/** What a pickup whose `art` isn't in `bins` shows. */
export const UNKNOWN_BIN: Omit<Bin, "name"> = {
	icon: "mdi:trash-can-outline",
	color: "#8E8E93",
};

/** Validate a user config. Throws only when the card can't render, so HA shows its error card. */
export function normalizeConfig(
	config: LovelaceCardConfig,
): UpcomingPickupsConfig {
	const fail = (what: string) => new Error(`upcoming-pickups-card: ${what}`);
	const entity = config.entity ?? STUB_ENTITY;
	if (typeof entity !== "string" || !entity) throw fail("`entity` fehlt");
	let bins = [...DEFAULT_BINS];
	if (config.bins !== undefined) {
		if (!Array.isArray(config.bins)) throw fail("`bins` muss eine Liste sein");
		bins = (config.bins as Record<string, unknown>[]).map((bin) => ({
			name: String(bin.name ?? ""),
			icon: String(bin.icon ?? UNKNOWN_BIN.icon),
			color: String(bin.color ?? UNKNOWN_BIN.color),
		}));
		if (bins.some((bin) => !bin.name)) throw fail("jede Tonne braucht `name`");
	}
	const maxRows = config.max_rows === undefined ? 3 : Number(config.max_rows);
	if (!Number.isInteger(maxRows) || maxRows < 1)
		throw fail("`max_rows` muss eine ganze Zahl ≥ 1 sein");
	return {
		entity,
		bins,
		max_rows: maxRows,
		tap_action: (config.tap_action as ActionConfig | undefined) ?? {
			action: "navigate",
			navigation_path: "#muell",
		},
	};
}

const LABELS: Record<string, string> = {
	entity: "Müll-Erinnerung",
	max_rows: "Höchstens Zeilen",
	tap_action: "Beim Tippen",
};

/** HA renders this with its own form; `bins` is YAML-only (HA keeps keys the form doesn't show). */
export const configForm = {
	schema: [
		{
			name: "entity",
			required: true,
			selector: { entity: { domain: "binary_sensor" } },
		},
		{
			name: "max_rows",
			selector: { number: { min: 1, max: 3, mode: "box" } },
		},
		{ name: "tap_action", selector: { ui_action: {} } },
	],
	computeLabel: (field: { name: string }) => LABELS[field.name],
	assertConfig: (config: LovelaceCardConfig) => {
		normalizeConfig(config);
	},
};
