import { describe, expect, it } from "vitest";
import { layoutFor, todayRange } from "./history";

// High/low are today's *measured* min/max, read from the recorder (no helpers); the card resizes seamlessly
// between half and full width.
describe("todayRange", () => {
	const midnight = Date.parse("2026-11-21T00:00:00+01:00");
	const hour = 3_600_000;
	const rows = [
		{ start: midnight - hour, min: 4, max: 15 }, // yesterday: ignored
		{ start: midnight, min: 9.1, max: 10.2 },
		{ start: midnight + hour, min: 9.4, max: 12.9 },
	];

	it("takes today's hourly min/max and the current reading", () => {
		expect(todayRange(rows, 10.6, midnight)).toEqual({ low: 9.1, high: 12.9 });
		expect(todayRange(rows, 13.4, midnight)).toEqual({ low: 9.1, high: 13.4 });
	});

	it("falls back to the current reading right after midnight", () => {
		expect(todayRange(rows.slice(0, 1), 7.2, midnight)).toEqual({
			low: 7.2,
			high: 7.2,
		});
	});
});

describe("layoutFor", () => {
	it("follows the measured width unless a layout is configured", () => {
		expect(layoutFor(171, "auto")).toBe("half");
		expect(layoutFor(351, "auto")).toBe("full");
		expect(layoutFor(351, "half")).toBe("half");
		expect(layoutFor(171, "full")).toBe("full");
	});
});
