import type { HassEntity, HomeAssistant } from "../../ha/types";

/**
 * The alert the stock area card shows as its icon badge (frontend 20261028.6, hui-area-card
 * `_computeActiveAlertStates`): the first `on` binary sensor of the area, per alert class in config
 * order. An entity belongs to the area directly or through its device; config/diagnostic entities and
 * excluded ones don't count.
 */
export function activeAlert(
	hass: HomeAssistant | undefined,
	areaId: string,
	alertClasses: readonly string[],
	excludeEntities: readonly string[] = [],
): HassEntity | undefined {
	if (!hass?.entities || alertClasses.length === 0) return undefined;
	const inArea = Object.values(hass.entities).filter((entry) => {
		if (!entry.entity_id.startsWith("binary_sensor.")) return false;
		if (entry.entity_category || excludeEntities.includes(entry.entity_id))
			return false;
		const area =
			entry.area_id ??
			(entry.device_id ? hass.devices?.[entry.device_id]?.area_id : undefined);
		return area === areaId;
	});
	for (const alertClass of alertClasses) {
		for (const entry of inArea) {
			const state = hass.states[entry.entity_id];
			if (state?.state === "on" && state.attributes.device_class === alertClass)
				return state;
		}
	}
	return undefined;
}

/** HA's icons for an `on` binary sensor of these classes. */
const ON_ICONS: Record<string, string> = {
	occupancy: "mdi:home",
	presence: "mdi:home",
	motion: "mdi:motion-sensor",
	door: "mdi:door-open",
	window: "mdi:window-open",
	moisture: "mdi:water",
	smoke: "mdi:smoke-detector-variant-alert",
};

/** The badge icon: the entity's registry icon, its own icon, else HA's icon for the class. */
export function alertIcon(
	hass: HomeAssistant | undefined,
	entity: HassEntity,
): string {
	const registry = hass?.entities?.[entity.entity_id]?.icon;
	if (registry) return registry;
	const own = entity.attributes.icon;
	if (typeof own === "string" && own) return own;
	return ON_ICONS[String(entity.attributes.device_class)] ?? "mdi:alert-circle";
}
