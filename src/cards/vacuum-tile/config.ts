import type { ActionConfig, LovelaceCardConfig } from "../../ha/types";

/** `vacuum-tile-card` config after defaults. Templates are Jinja, rendered by HA (`render_template`). */
export interface VacuumTileConfig {
	entity: string;
	name?: string;
	icon?: string;
	battery_entity?: string;
	charging_entity?: string;
	/** Appended to HA's translated state with " · " when it renders to text (room, error text, …). */
	state_detail?: string;
	/** Lines below the tile row while no features are shown; one line per text line, `**bold**` allowed. */
	lines?: string;
	/** Truthy → the warning badge on the icon. */
	warning?: string;
	warning_icon: string;
	/** Stock card features (or custom ones) in the bottom slot. */
	features: unknown[];
	/** States that show the features instead of the lines; default: every active state (not docked). */
	features_states?: string[];
	/** Truthy → active (features instead of lines); overrides the state and `features_states` once rendered. */
	active?: string;
	tap_action: ActionConfig;
	hold_action: ActionConfig;
	icon_tap_action: ActionConfig;
}

const MORE_INFO: ActionConfig = { action: "more-info" };
/** HA's tile gives the icon an action only for toggleable domains, buttons and scenes; vacuums get none. */
const NONE: ActionConfig = { action: "none" };

export function normalizeConfig(config: LovelaceCardConfig): VacuumTileConfig {
	if (typeof config.entity !== "string" || !config.entity)
		throw new Error("vacuum-tile-card: `entity` fehlt");
	const text = (key: string) =>
		typeof config[key] === "string" && config[key] !== ""
			? (config[key] as string)
			: undefined;
	return {
		entity: config.entity,
		name: text("name"),
		icon: text("icon"),
		battery_entity: text("battery_entity"),
		charging_entity: text("charging_entity"),
		state_detail: text("state_detail"),
		lines: text("lines"),
		warning: text("warning"),
		warning_icon: text("warning_icon") ?? "mdi:exclamation",
		features: Array.isArray(config.features) ? config.features : [],
		// An empty list (the editor's select after clearing it) means the default, like no list.
		features_states:
			Array.isArray(config.features_states) && config.features_states.length
				? config.features_states.map(String)
				: undefined,
		active: text("active"),
		tap_action: (config.tap_action as ActionConfig | undefined) ?? MORE_INFO,
		hold_action: (config.hold_action as ActionConfig | undefined) ?? MORE_INFO,
		icon_tap_action:
			(config.icon_tap_action as ActionConfig | undefined) ?? NONE,
	};
}

/** A template result counts as true unless it's empty or HA's usual false words. */
export function truthy(result: unknown): boolean {
	if (typeof result === "boolean") return result;
	if (typeof result === "number") return result !== 0;
	if (typeof result !== "string") return false;
	return !["", "false", "off", "0", "none"].includes(
		result.trim().toLowerCase(),
	);
}

/** Split rendered lines into text lines; `**x**` marks bold parts. */
export function splitLines(
	result: unknown,
): { text: string; bold: boolean }[][] {
	if (result === undefined || result === null) return [];
	return String(result)
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line !== "")
		.map((line) =>
			line
				.split(/\*\*(.+?)\*\*/)
				.map((text, index) => ({ text, bold: index % 2 === 1 }))
				.filter((part) => part.text !== ""),
		);
}
