import { stateColorCss } from "../../ha/state-color";
import type { HassEntity } from "../../ha/types";
import type { EntityControl } from "./config";
import { isOn } from "./icons";

/** Whether the button is on: the item's `active` rule if it has one, else the default (`isOn`). */
export function isControlOn(
	control: EntityControl,
	entity: HassEntity,
): boolean {
	const rule = control.active;
	if (!rule) return isOn(entity);
	const value = rule.json_key
		? (jsonValue(entity.state, rule.json_key) ?? rule.default)
		: entity.state;
	return value !== undefined && rule.state.includes(value);
}

function jsonValue(state: string, key: string): string | undefined {
	try {
		const value = (JSON.parse(state) as Record<string, unknown> | null)?.[key];
		return value === undefined || value === null ? undefined : String(value);
	} catch {
		// Not JSON (yet): the rule's default applies.
		return undefined;
	}
}

/** The on colour: the item's `active_color` (theme name or CSS colour), else HA's state colour cascade. */
export function activeColorCss(
	control: EntityControl,
	entity: HassEntity,
): string {
	const color = control.active_color;
	if (color)
		return /^[a-z]+(-[a-z]+)*$/.test(color) ? `var(--${color}-color)` : color;
	return stateColorCss(entity) ?? "var(--state-active-color)";
}
