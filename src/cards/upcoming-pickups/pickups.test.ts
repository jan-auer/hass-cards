import { describe, expect, it } from "vitest";
import { normalizeConfig } from "./config";
import { daysUntil, parseLocalDate, pickupRows } from "./pickups";

// Next pickup per bin, sorted; "Heute"/"Morgen" bold, else "in N Tagen"; after dismissal (`erledigt`) rows due
// today or tomorrow read "✓ Rausgestellt"; days are calendar days between local dates.
const CONFIG = normalizeConfig({ type: "custom:upcoming-pickups-card" });

describe("parseLocalDate", () => {
	it("reads YYYY-MM-DD as local midnight, not UTC", () => {
		const date = parseLocalDate("2026-12-09");
		expect(date?.getFullYear()).toBe(2026);
		expect(date?.getMonth()).toBe(11);
		expect(date?.getDate()).toBe(9);
		expect(date?.getHours()).toBe(0);
	});

	it("rejects anything else", () => {
		expect(parseLocalDate("09.12.2026")).toBeUndefined();
		expect(parseLocalDate(undefined)).toBeUndefined();
		expect(parseLocalDate("2026-02-31")).toBeUndefined();
	});
});

describe("daysUntil", () => {
	it("counts calendar days, whatever the time of day", () => {
		expect(daysUntil("2026-11-23", new Date(2026, 10, 23, 23, 59))).toBe(0);
		expect(daysUntil("2026-11-24", new Date(2026, 10, 23, 23, 59))).toBe(1);
		expect(daysUntil("2026-11-24", new Date(2026, 10, 23, 0, 1))).toBe(1);
		expect(daysUntil("2026-12-09", new Date(2026, 10, 23, 8))).toBe(16);
	});

	it("is exact across the DST change", () => {
		expect(daysUntil("2027-03-29", new Date(2027, 2, 27, 12))).toBe(2);
	});
});

describe("pickupRows", () => {
	const now = new Date(2026, 10, 23, 18);
	const termine = [
		{ art: "Restmüll", datum: "2026-11-23" },
		{ art: "Altpapier", datum: "2026-11-24" },
		{ art: "Gelber Sack", datum: "2026-11-30" },
	];

	it("shows Heute, Morgen bold and in N Tagen regular, with each bin's icon and colour", () => {
		expect(pickupRows(termine, false, CONFIG, now)).toEqual([
			{
				icon: "mdi:trash-can-outline",
				color: "#8E8E93",
				text: "Heute",
				bold: true,
			},
			{ icon: "mdi:newspaper", color: "#FF453A", text: "Morgen", bold: true },
			{
				icon: "mdi:recycle-variant",
				color: "#F5B800",
				text: "in 7 Tagen",
				bold: false,
			},
		]);
	});

	it("reads ✓ Rausgestellt for today and tomorrow once dismissed", () => {
		const texts = pickupRows(termine, true, CONFIG, now).map((row) => row.text);
		expect(texts).toEqual(["✓ Rausgestellt", "✓ Rausgestellt", "in 7 Tagen"]);
	});

	it("gives an unknown bin the grey can", () => {
		const [row] = pickupRows(
			[{ art: "Bio", datum: "2026-11-25" }],
			false,
			CONFIG,
			now,
		);
		expect(row).toMatchObject({
			icon: "mdi:trash-can-outline",
			color: "#8E8E93",
			text: "in 2 Tagen",
		});
	});

	it("shows at most max_rows and skips unreadable or past entries", () => {
		const config = normalizeConfig({
			type: "custom:upcoming-pickups-card",
			max_rows: 2,
		});
		const rows = pickupRows(
			[
				{ art: "Restmüll", datum: "2026-11-22" },
				{ art: "Restmüll", datum: "kaputt" },
				...termine,
			],
			false,
			config,
			now,
		);
		expect(rows.map((row) => row.text)).toEqual(["Heute", "Morgen"]);
	});

	it("is empty when the attribute is missing", () => {
		expect(pickupRows(undefined, false, CONFIG, now)).toEqual([]);
	});
});
