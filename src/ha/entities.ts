import { stateActive } from "./state-color";
import type { HomeAssistant } from "./types";

/**
 * Whether any of `entityIds` changed between two `hass` objects. HA replaces a state object only
 * when that entity changes, so a reference check is enough (the same logic as HA's internal
 * `hasConfigOrEntityChanged`, which isn't exported).
 */
export function entitiesChanged(
	previous: HomeAssistant | undefined,
	next: HomeAssistant | undefined,
	entityIds: readonly string[],
): boolean {
	if (!previous || !next) return previous !== next;
	if (previous.themes?.darkMode !== next.themes?.darkMode) return true;
	return entityIds.some((id) => previous.states[id] !== next.states[id]);
}

/** Active the way HA counts it (on, open, playing, home, …): HA's own `stateActive`. */
export function isActive(
	hass: HomeAssistant | undefined,
	entityId: string | undefined,
): boolean {
	const entity = entityId ? hass?.states[entityId] : undefined;
	return entity !== undefined && stateActive(entity);
}
