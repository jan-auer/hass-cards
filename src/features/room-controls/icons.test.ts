import { describe, expect, it } from "vitest";
import type { HassEntity } from "../../ha/types";
import { controlIcon, isOn } from "./icons";

const entity = (
	entity_id: string,
	state: string,
	attributes: Record<string, unknown> = {},
): HassEntity => ({
	entity_id,
	state,
	attributes,
	last_changed: "",
	last_updated: "",
});

// The row picks the icon per domain and state.
describe("controlIcon", () => {
	it("uses state icons for lights, shutters and speakers", () => {
		expect(controlIcon(entity("light.a", "on"))).toBe("mdi:lightbulb");
		expect(controlIcon(entity("light.a", "off"))).toBe(
			"mdi:lightbulb-off-outline",
		);
		expect(controlIcon(entity("cover.a", "open"))).toBe(
			"mdi:window-shutter-open",
		);
		expect(controlIcon(entity("cover.a", "closed"))).toBe("mdi:window-shutter");
		expect(controlIcon(entity("media_player.a", "playing"))).toBe(
			"mdi:speaker-play",
		);
		expect(controlIcon(entity("media_player.a", "paused"))).toBe("mdi:speaker");
	});

	it("uses the cover's device class", () => {
		expect(
			controlIcon(entity("cover.a", "closed", { device_class: "curtain" })),
		).toBe("mdi:curtains-closed");
	});

	it("prefers the config icon; state icons win over a device icon, other domains keep theirs", () => {
		expect(
			controlIcon(entity("light.a", "on", { icon: "mdi:lamp" }), "mdi:x"),
		).toBe("mdi:x");
		expect(
			controlIcon(
				entity("media_player.a", "paused", { icon: "phu:sonos-arc" }),
			),
		).toBe("mdi:speaker");
		expect(
			controlIcon(entity("switch.a", "off", { icon: "mdi:fountain" })),
		).toBe("mdi:fountain");
		expect(controlIcon(entity("switch.a", "off"))).toBe(
			"mdi:toggle-switch-variant-off",
		);
	});
});

describe("isOn", () => {
	it("counts a speaker as on only while it plays; everything else like HA", () => {
		expect(isOn(entity("media_player.a", "paused"))).toBe(false);
		expect(isOn(entity("media_player.a", "playing"))).toBe(true);
		expect(isOn(entity("cover.a", "opening"))).toBe(true);
		expect(isOn(entity("light.a", "off"))).toBe(false);
	});
});
