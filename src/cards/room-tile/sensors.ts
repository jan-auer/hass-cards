import type { AreaEntry, HomeAssistant } from "../../ha/types";

/**
 * The header's sensor line for `photo-large`: the area's own temperature and humidity sensors (area
 * settings), formatted by HA, in `sensor_classes` order, as the stock area card shows them. Other classes
 * and areas without these sensors show nothing (the stock card would average all sensors of the area).
 */
export function sensorLine(
	hass: HomeAssistant | undefined,
	area: AreaEntry | undefined,
	sensorClasses: readonly string[],
): string {
	if (!hass || !area) return "";
	return sensorClasses
		.map((sensorClass) => {
			const entityId =
				sensorClass === "temperature"
					? area.temperature_entity_id
					: sensorClass === "humidity"
						? area.humidity_entity_id
						: undefined;
			const state = entityId ? hass.states[entityId] : undefined;
			if (!state || state.state === "unavailable" || state.state === "unknown")
				return "";
			return (
				hass.formatEntityState?.(state) ??
				`${state.state} ${state.attributes.unit_of_measurement ?? ""}`.trim()
			);
		})
		.filter(Boolean)
		.join(" · ");
}

/** Entities the sensor line reads, for change detection. */
export function sensorEntities(area: AreaEntry | undefined): string[] {
	return [area?.temperature_entity_id, area?.humidity_entity_id].filter(
		(id): id is string => typeof id === "string",
	);
}
