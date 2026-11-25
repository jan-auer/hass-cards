import { describe, expect, it } from "vitest";
import type { HassEntity, HomeAssistant } from "../../ha/types";
import { activeAlert, alertIcon } from "./alerts";

const state = (
	entity_id: string,
	value: string,
	device_class?: string,
): HassEntity => ({
	entity_id,
	state: value,
	attributes: device_class ? { device_class } : {},
	last_changed: "",
	last_updated: "",
});

function mockHass(states: HassEntity[]): HomeAssistant {
	return {
		states: Object.fromEntries(states.map((s) => [s.entity_id, s])),
		entities: {
			"binary_sensor.direct": {
				entity_id: "binary_sensor.direct",
				area_id: "buro",
			},
			"binary_sensor.via_device": {
				entity_id: "binary_sensor.via_device",
				device_id: "dev1",
			},
			"binary_sensor.diag": {
				entity_id: "binary_sensor.diag",
				area_id: "buro",
				entity_category: "diagnostic",
			},
			"binary_sensor.elsewhere": {
				entity_id: "binary_sensor.elsewhere",
				area_id: "kitchen",
			},
		},
		devices: { dev1: { area_id: "buro" } },
	};
}

// The photo covers the stock icon and its badge, so the card finds the same alert the area card shows:
// the first active binary sensor in the area per alert class, in the order of alert_classes.
describe("activeAlert", () => {
	it("finds an active sensor of the area, directly or through its device", () => {
		const hass = mockHass([
			state("binary_sensor.direct", "off", "occupancy"),
			state("binary_sensor.via_device", "on", "motion"),
		]);
		expect(activeAlert(hass, "buro", ["occupancy", "motion"])?.entity_id).toBe(
			"binary_sensor.via_device",
		);
	});

	it("follows the order of the alert classes", () => {
		const hass = mockHass([
			state("binary_sensor.direct", "on", "occupancy"),
			state("binary_sensor.via_device", "on", "motion"),
		]);
		expect(activeAlert(hass, "buro", ["motion", "occupancy"])?.entity_id).toBe(
			"binary_sensor.via_device",
		);
	});

	it("skips other areas, diagnostic entities and excluded ones", () => {
		const hass = mockHass([
			state("binary_sensor.diag", "on", "occupancy"),
			state("binary_sensor.elsewhere", "on", "occupancy"),
			state("binary_sensor.direct", "on", "occupancy"),
		]);
		expect(
			activeAlert(hass, "buro", ["occupancy"], ["binary_sensor.direct"]),
		).toBeUndefined();
	});
});

describe("alertIcon", () => {
	it("uses the registry icon, else the class's on icon", () => {
		const hass = mockHass([]);
		expect(
			alertIcon(hass, state("binary_sensor.direct", "on", "occupancy")),
		).toBe("mdi:home");
		expect(alertIcon(hass, state("binary_sensor.x", "on", "motion"))).toBe(
			"mdi:motion-sensor",
		);
		hass.entities = {
			"binary_sensor.direct": {
				entity_id: "binary_sensor.direct",
				icon: "mdi:account",
			},
		};
		expect(
			alertIcon(hass, state("binary_sensor.direct", "on", "occupancy")),
		).toBe("mdi:account");
	});
});
