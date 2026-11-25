import { stateActive } from "../../ha/state-color";
import type { HassEntity } from "../../ha/types";

/**
 * [on, off] for domains whose button shows its state in the icon; these win over the entity's own icon
 * (lights, speakers and spots often carry device icons).
 */
const STATE_ICONS: Record<string, readonly [string, string]> = {
	light: ["mdi:lightbulb", "mdi:lightbulb-off-outline"],
	cover: ["mdi:window-shutter-open", "mdi:window-shutter"],
	media_player: ["mdi:speaker-play", "mdi:speaker"],
	fan: ["mdi:fan", "mdi:fan-off"],
	valve: ["mdi:valve-open", "mdi:valve-closed"],
	lock: ["mdi:lock-open-variant", "mdi:lock"],
};

/** [on, off] for other domains, used only when the entity has no icon of its own (e.g. a fountain switch). */
const DOMAIN_ICONS: Record<string, readonly [string, string]> = {
	switch: ["mdi:toggle-switch-variant", "mdi:toggle-switch-variant-off"],
	input_boolean: ["mdi:toggle-switch-variant", "mdi:toggle-switch-variant-off"],
	climate: ["mdi:thermostat", "mdi:thermostat"],
	vacuum: ["mdi:robot-vacuum", "mdi:robot-vacuum"],
	script: ["mdi:script-text-play", "mdi:script-text"],
	scene: ["mdi:palette", "mdi:palette"],
};

/** Covers by device class (HA's own icons for these classes). */
const COVER_ICONS: Record<string, readonly [string, string]> = {
	blind: ["mdi:blinds-horizontal", "mdi:blinds-horizontal-closed"],
	shade: ["mdi:roller-shade", "mdi:roller-shade-closed"],
	curtain: ["mdi:curtains", "mdi:curtains-closed"],
	garage: ["mdi:garage-open", "mdi:garage"],
	door: ["mdi:door-open", "mdi:door-closed"],
	window: ["mdi:window-open", "mdi:window-closed"],
};

const FALLBACK: readonly [string, string] = [
	"mdi:checkbox-blank-circle",
	"mdi:checkbox-blank-circle-outline",
];

/** Whether the button lights up: a speaker only while it plays, the rest like HA. */
export function isOn(entity: HassEntity): boolean {
	return entity.entity_id.startsWith("media_player.")
		? entity.state === "playing"
		: stateActive(entity);
}

/**
 * The config's icon; else the state icon for lights, covers, speakers, fans, valves and locks; else the
 * entity's own icon; else a generic icon for the domain and state.
 */
export function controlIcon(
	entity: HassEntity,
	icon?: string,
	on: boolean = isOn(entity),
): string {
	if (icon) return icon;
	const domain = entity.entity_id.split(".", 1)[0];
	const deviceClass = entity.attributes.device_class;
	const statePair =
		(domain === "cover" && typeof deviceClass === "string"
			? COVER_ICONS[deviceClass]
			: undefined) ?? STATE_ICONS[domain];
	const own = entity.attributes.icon;
	if (!statePair && typeof own === "string" && own) return own;
	const pair = statePair ?? DOMAIN_ICONS[domain] ?? FALLBACK;
	return on ? pair[0] : pair[1];
}
