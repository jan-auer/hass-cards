import { describe, expect, it } from "vitest";
import { chartMax, dailyBars, dayStarts, isRaining, lastRain } from "./daily";

// 14 daily bars from the recorder, today from the live daily total; "Zuletzt" is the most recent earlier day with
// rain; raining only while the rate is > 0.
describe("dailyBars", () => {
	const now = new Date(2026, 10, 23, 14, 30);
	const starts = dayStarts(now);

	it("gives 14 local midnights ending today", () => {
		expect(starts).toHaveLength(14);
		expect(new Date(starts[0]).getDate()).toBe(10);
		expect(new Date(starts[13]).getTime()).toBe(
			new Date(2026, 10, 23).getTime(),
		);
	});

	it("places each day's change on its day; missing days are 0; today is the live total", () => {
		const rows = [
			{ start: new Date(2026, 10, 10).getTime(), change: 1.2 },
			{ start: new Date(2026, 10, 21).getTime(), change: 7.5 },
			{ start: new Date(2026, 10, 22).getTime(), change: null },
			{ start: new Date(2026, 10, 23).getTime(), change: 0.1 }, // lags: replaced
		];
		const bars = dailyBars(rows, starts, 0.2);
		expect(bars).toHaveLength(14);
		expect(bars[0]).toBe(1.2);
		expect(bars[11]).toBe(7.5);
		expect(bars[12]).toBe(0);
		expect(bars[13]).toBe(0.2);
	});
});

describe("lastRain", () => {
	const starts = dayStarts(new Date(2026, 10, 23, 9));

	it("picks the most recent earlier day with rain, not today", () => {
		const bars = [0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 7.5, 0, 0.2];
		expect(lastRain(bars, starts)).toEqual({ day: 21, amount: 7.5 });
	});

	it("is undefined when the 14 days were dry", () => {
		expect(lastRain(new Array(14).fill(0), starts)).toBeUndefined();
	});
});

describe("isRaining", () => {
	it("counts only a positive rate (the wet piezo's state alone isn't rain)", () => {
		expect(isRaining(2.4)).toBe(true);
		expect(isRaining(0)).toBe(false);
		expect(isRaining(undefined)).toBe(false);
	});
});

describe("chartMax", () => {
	it("is at least 8 mm", () => {
		expect(chartMax([0, 2, 7.4])).toBe(8);
		expect(chartMax([0, 12.5])).toBe(12.5);
	});
});
