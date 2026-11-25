import { describe, expect, it } from "vitest";
import { normalizeConfig } from "./config";

// The weather card has the half and full layouts.
describe("normalizeConfig", () => {
	it("accepts auto, half and full", () => {
		for (const layout of ["auto", "half", "full"])
			expect(
				normalizeConfig({
					type: "custom:weather-summary-card",
					temperature: "sensor.t",
					layout,
				}).layout,
			).toBe(layout);
	});

	it("rejects the dropped hero layout", () => {
		expect(() =>
			normalizeConfig({
				type: "custom:weather-summary-card",
				temperature: "sensor.t",
				layout: "hero",
			}),
		).toThrow(/layout/);
	});
});
