import { describe, expect, it } from "vitest";
import { stateActive, stateColorCss } from "./state-color";
import type { HassEntity } from "./types";

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

// Active states use the theme's state colours through HA's own variable cascade, like HA's tile.
describe("stateColorCss", () => {
	it("builds HA's cascade from the most specific variable to the global one", () => {
		expect(stateColorCss(entity("cover.wohnzimmer", "open"))).toBe(
			"var(--state-cover-open-color, var(--state-cover-active-color, var(--state-active-color)))",
		);
		expect(
			stateColorCss(
				entity("cover.raffstore", "opening", { device_class: "blind" }),
			),
		).toBe(
			"var(--state-cover-blind-opening-color, var(--state-cover-opening-color, var(--state-cover-active-color, var(--state-active-color))))",
		);
		expect(stateColorCss(entity("light.buro", "off"))).toBe(
			"var(--state-light-off-color, var(--state-light-inactive-color, var(--state-inactive-color)))",
		);
		expect(stateColorCss(entity("media_player.sonos", "unavailable"))).toBe(
			"var(--state-unavailable-color)",
		);
	});
});

describe("stateActive", () => {
	it("follows HA's rules per domain", () => {
		expect(stateActive(entity("cover.x", "closed"))).toBe(false);
		expect(stateActive(entity("cover.x", "closing"))).toBe(true);
		expect(stateActive(entity("media_player.x", "paused"))).toBe(true);
		expect(stateActive(entity("media_player.x", "standby"))).toBe(false);
		expect(stateActive(entity("light.x", "on"))).toBe(true);
		expect(stateActive(entity("binary_sensor.x", "off"))).toBe(false);
	});
});
