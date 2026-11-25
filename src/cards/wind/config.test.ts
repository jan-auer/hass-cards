import { describe, expect, it } from "vitest";
import { normalizeConfig } from "./config";
import { WindCard } from "./wind-card";

// No built-in sensors: every wind entity is set in the config; the card picker fills in examples.
describe("normalizeConfig", () => {
	it("requires every wind entity", () => {
		expect(() => normalizeConfig({ type: "custom:wind-card" })).toThrow(
			/speed/,
		);
		expect(() =>
			normalizeConfig({
				type: "custom:wind-card",
				speed: "sensor.wind_speed",
				gust: "sensor.wind_gust",
				direction: "sensor.wind_direction",
				direction_avg: "sensor.wind_direction_avg",
			}),
		).toThrow(/max_today/);
	});

	it("accepts the card picker's stub config", () => {
		const stub = WindCard.getStubConfig();
		expect(normalizeConfig({ type: "custom:wind-card", ...stub }).speed).toBe(
			stub.speed,
		);
	});
});
