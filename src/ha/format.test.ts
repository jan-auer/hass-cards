import { describe, expect, it } from "vitest";
import { decimal, numericState } from "./format";
import type { HomeAssistant } from "./types";

describe("decimal", () => {
	it("uses a comma and a real minus sign", () => {
		expect(decimal(-2.14, 1, "de")).toBe("−2,1");
	});
});

describe("numericState", () => {
	const hass = {
		states: {
			"sensor.a": { state: "3.5" },
			"sensor.b": { state: "unavailable" },
		},
	} as unknown as HomeAssistant;

	it("reads numbers and skips unavailable states", () => {
		expect(numericState(hass, "sensor.a")).toBe(3.5);
		expect(numericState(hass, "sensor.b")).toBeUndefined();
		expect(numericState(hass, "sensor.missing")).toBeUndefined();
	});
});
