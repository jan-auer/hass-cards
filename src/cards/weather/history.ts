import type { HomeAssistant } from "../../ha/types";

/** One hourly long-term statistics row. HA sends `start` as epoch ms (older versions: an ISO string). */
export interface HourlyStat {
	start: number;
	mean?: number | null;
	min?: number | null;
	max?: number | null;
}

/** Half (a 6-column tile) or full width. */
export type WeatherLayout = "half" | "full";
export type LayoutSetting = WeatherLayout | "auto";

/** Below this width the card shows the half-width layout (6 of 12 columns on a phone is ~171 pt). */
export const FULL_LAYOUT_MIN_WIDTH = 300;

export function layoutFor(
	width: number,
	setting: LayoutSetting,
): WeatherLayout {
	if (setting !== "auto") return setting;
	return width >= FULL_LAYOUT_MIN_WIDTH ? "full" : "half";
}

/** Today's measured low and high: hourly min/max since local midnight plus the current reading. */
export function todayRange(
	rows: readonly HourlyStat[],
	current: number,
	midnight: number,
): { low: number; high: number } {
	let low = current;
	let high = current;
	for (const row of rows) {
		if (row.start < midnight) continue;
		if (typeof row.min === "number") low = Math.min(low, row.min);
		if (typeof row.max === "number") high = Math.max(high, row.max);
	}
	return { low, high };
}

/** The curve: the last 24 hourly means, then the current reading as "now". */
export function curveValues(
	rows: readonly HourlyStat[],
	current: number,
): number[] {
	const means = rows
		.map((row) => row.mean)
		.filter((mean): mean is number => typeof mean === "number");
	return [...means.slice(-24), current];
}

/** Rain bars for the curve's hours: [curve index, mm/h] for every hour with rain, plus now. */
export function rainBars(
	rows: readonly HourlyStat[],
	curveLength: number,
	currentRate: number,
): [number, number][] {
	const hours = rows.slice(-(curveLength - 1));
	const offset = curveLength - 1 - hours.length;
	const bars: [number, number][] = [];
	hours.forEach((row, index) => {
		if (typeof row.max === "number" && row.max > 0)
			bars.push([offset + index, row.max]);
	});
	if (currentRate > 0) bars.push([curveLength - 1, currentRate]);
	return bars;
}

/** Hourly mean/min/max for the last 24 h of each statistic, through the documented recorder API. */
export async function fetchHourly(
	hass: HomeAssistant,
	statisticIds: readonly string[],
): Promise<Record<string, HourlyStat[]>> {
	if (!hass.callWS) throw new Error("hass.callWS fehlt");
	const since = new Date(Date.now() - 24 * 3_600_000);
	since.setMinutes(0, 0, 0);
	const result = await hass.callWS<
		Record<
			string,
			Array<Omit<HourlyStat, "start"> & { start: number | string }>
		>
	>({
		type: "recorder/statistics_during_period",
		start_time: since.toISOString(),
		statistic_ids: statisticIds,
		period: "hour",
		types: ["mean", "min", "max"],
	});
	return Object.fromEntries(
		Object.entries(result).map(([id, rows]) => [
			id,
			rows.map((row) => ({
				...row,
				start:
					typeof row.start === "number" ? row.start : Date.parse(row.start),
			})),
		]),
	);
}
