import { describe, expect, it } from "vitest";
import type { HomeAssistant } from "../../ha/types";
import "./room-controls";

// room-controls is a room's buttons: the feature picker offers it only on cards about an area.
describe("room-controls in the feature picker", () => {
	const entry = window.customCardFeatures?.find(
		(feature) => feature.type === "room-controls",
	);
	const hass = { states: {} } as HomeAssistant;

	it("is supported on area cards", () => {
		expect(entry?.isSupported?.(hass, { area_id: "kitchen" })).toBe(true);
	});

	it("isn't offered on entity cards", () => {
		expect(entry?.isSupported?.(hass, { entity_id: "light.kitchen" })).toBe(
			false,
		);
		expect(entry?.isSupported?.(hass, {})).toBe(false);
	});
});
