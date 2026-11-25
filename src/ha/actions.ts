import type { ActionConfig } from "./types";

export type { ActionConfig } from "./types";

/**
 * Hand an action to HA through the documented `hass-action` event, so it behaves exactly like a
 * stock card's `tap_action` (navigation, perform-action, more-info, …). `entity` is the default
 * target for `more-info` and `toggle`.
 */
export function fireHassAction(
	node: HTMLElement,
	tapAction: ActionConfig,
	entity?: string,
): void {
	const config = entity
		? { entity, tap_action: tapAction }
		: { tap_action: tapAction };
	node.dispatchEvent(
		new CustomEvent("hass-action", {
			bubbles: true,
			composed: true,
			detail: { config, action: "tap" },
		}),
	);
}
