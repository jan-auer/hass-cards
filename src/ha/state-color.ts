import type { HassEntity } from "./types";

// Copies of HA's frontend logic (20261028.6: src/common/entity/state_active.ts and state_color.ts), so our
// buttons colour active states exactly like HA's tile, through the theme's state-colour variables.

const TIMESTAMP_STATE_DOMAINS = new Set([
	"button",
	"event",
	"input_button",
	"scene",
]);

/** Domains HA colours by state (STATE_COLORED_DOMAIN). */
const STATE_COLORED_DOMAINS = new Set([
	"alarm_control_panel",
	"alert",
	"automation",
	"binary_sensor",
	"calendar",
	"camera",
	"climate",
	"cover",
	"device_tracker",
	"fan",
	"group",
	"humidifier",
	"input_boolean",
	"lawn_mower",
	"light",
	"lock",
	"media_player",
	"person",
	"plant",
	"remote",
	"schedule",
	"script",
	"siren",
	"sun",
	"switch",
	"timer",
	"update",
	"vacuum",
	"valve",
	"water_heater",
]);

const domainOf = (entity: HassEntity) => entity.entity_id.split(".", 1)[0];

/** HA's `stateActive`: whether an entity counts as active (on, open, playing, home, …). */
export function stateActive(entity: HassEntity): boolean {
	const domain = domainOf(entity);
	const state = entity.state;
	if (TIMESTAMP_STATE_DOMAINS.has(domain)) return state !== "unavailable";
	if (state === "unavailable" || state === "unknown") return false;
	if (state === "off" && domain !== "alert") return false;
	switch (domain) {
		case "alarm_control_panel":
			return state !== "disarmed";
		case "alert":
			return state !== "idle";
		case "cover":
		case "valve":
			return state !== "closed";
		case "device_tracker":
		case "person":
			return state !== "not_home";
		case "lawn_mower":
			return state === "mowing" || state === "error";
		case "lock":
			return state !== "locked";
		case "media_player":
			return state !== "standby";
		case "vacuum":
			return state !== "docked";
		case "plant":
			return state === "problem";
		case "group":
			return ["on", "home", "open", "locked", "problem"].includes(state);
		case "timer":
			return state === "active";
		case "camera":
			return state === "streaming";
	}
	return true;
}

const slug = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "") || "unknown";

/**
 * HA's `stateColorCss`: `--state-{domain}-{device_class}-{state}-color` → `--state-{domain}-{state}-color` →
 * `--state-{domain}-{active|inactive}-color` → `--state-{active|inactive}-color`, as nested `var()`.
 * Undefined for domains HA doesn't colour.
 */
export function stateColorCss(entity: HassEntity): string | undefined {
	if (entity.state === "unavailable") return "var(--state-unavailable-color)";
	const domain = domainOf(entity);
	if (!STATE_COLORED_DOMAINS.has(domain)) return undefined;
	const activeKey = stateActive(entity) ? "active" : "inactive";
	const deviceClass = entity.attributes.device_class;
	const stateKey = slug(entity.state);
	const properties = [
		...(typeof deviceClass === "string"
			? [`--state-${domain}-${deviceClass}-${stateKey}-color`]
			: []),
		`--state-${domain}-${stateKey}-color`,
		`--state-${domain}-${activeKey}-color`,
		`--state-${activeKey}-color`,
	];
	return properties.reduceRight<string>(
		(inner, property) =>
			inner ? `var(${property}, ${inner})` : `var(${property})`,
		"",
	);
}
