import { describe, expect, it } from "vitest";
import { dayLabel, dayRows } from "./scale";

// One shared scale across all shown days; today's scale includes the current temperature so its dot stays on the
// bar.
describe("dayRows", () => {
	const forecast = [
		{
			datetime: "2026-11-23T00:00:00+01:00",
			condition: "rainy",
			temperature: 8,
			templow: 2,
			precipitation_probability: 60,
		},
		{
			datetime: "2026-11-24T00:00:00+01:00",
			condition: "cloudy",
			temperature: 12,
			templow: 4,
		},
		{
			datetime: "2026-11-25T00:00:00+01:00",
			condition: "sunny",
			temperature: 10,
			templow: 0,
			precipitation_probability: 10,
		},
	];

	it("places every bar on one scale from the lowest low to the highest high", () => {
		const rows = dayRows(forecast, undefined, undefined);
		const edges = rows.map((row) => [row.left, row.right].map(Math.round));
		expect(edges).toEqual([
			[17, 33],
			[33, 0],
			[0, 17],
		]);
		expect(rows[0].dot).toBeUndefined();
	});

	it("limits to the shown days", () => {
		const rows = dayRows(forecast, 2, undefined);
		expect(rows).toHaveLength(2);
		// Day 3's 0° no longer counts: the scale is 2…12.
		expect([rows[0].left, rows[0].right]).toEqual([0, 40]);
	});

	it("puts the current temperature on today's row and widens the scale for it", () => {
		const rows = dayRows(forecast, undefined, -2);
		expect(rows[0].dot).toBe(0);
		expect(rows[1].dot).toBeUndefined();
		expect(rows[1].right).toBe(0);
		expect(rows[1].left).toBeCloseTo((6 / 14) * 100, 5);
	});

	it("shows the rain chance only from 30 %", () => {
		const rows = dayRows(forecast, undefined, undefined);
		expect(rows.map((row) => row.rain)).toEqual([60, undefined, undefined]);
	});
});

describe("dayLabel", () => {
	it("says Heute for the first day, else the short German weekday", () => {
		expect(dayLabel("2026-11-23T00:00:00+01:00", 0, "de")).toBe("Heute");
		expect(dayLabel("2026-11-24T12:00:00+01:00", 1, "de")).toBe("Di");
		expect(dayLabel("2026-11-25T12:00:00+01:00", 2, "de")).toBe("Mi");
	});
});
