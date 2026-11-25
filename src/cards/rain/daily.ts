import type { HomeAssistant } from "../../ha/types";

/** One daily long-term statistics row. HA sends `start` as epoch ms (older versions: an ISO string). */
export interface DailyStat {
	start: number;
	change?: number | null;
}

export const DAYS = 14;

/** Local midnights of the last `count` days, oldest first, today last. */
export function dayStarts(now: Date, count = DAYS): number[] {
	return Array.from({ length: count }, (_, index) => {
		const day = new Date(now);
		day.setHours(0, 0, 0, 0);
		day.setDate(day.getDate() - (count - 1 - index));
		return day.getTime();
	});
}

function dayKey(time: number): string {
	return new Date(time).toDateString();
}

/** Rain per day (mm) for each of `starts`; today is the live daily total, since today's stats lag. */
export function dailyBars(
	rows: readonly DailyStat[],
	starts: readonly number[],
	today: number,
): number[] {
	const byDay = new Map<string, number>();
	for (const row of rows)
		if (typeof row.change === "number")
			byDay.set(dayKey(row.start), Math.max(0, row.change));
	return starts.map((start, index) =>
		index === starts.length - 1 ? today : (byDay.get(dayKey(start)) ?? 0),
	);
}

/** The most recent day before today with rain (≥ 0,05 mm, so it never reads "0,0 mm"). */
export function lastRain(
	bars: readonly number[],
	starts: readonly number[],
): { day: number; amount: number } | undefined {
	for (let index = bars.length - 2; index >= 0; index--)
		if (bars[index] >= 0.05)
			return { day: new Date(starts[index]).getDate(), amount: bars[index] };
	return undefined;
}

/** Raining only while the rate is positive: the piezo stays "on" while it's wet after the rain. */
export function isRaining(rate: number | undefined): boolean {
	return rate !== undefined && rate > 0;
}

/** The chart's top: at least 8 mm, so a drizzle doesn't fill it. */
export function chartMax(bars: readonly number[]): number {
	return Math.max(8, ...bars);
}

/** Daily change of a daily-resetting total, from `start` on, through the documented recorder API. */
export async function fetchDaily(
	hass: HomeAssistant,
	statisticId: string,
	start: number,
): Promise<DailyStat[]> {
	if (!hass.callWS) throw new Error("hass.callWS fehlt");
	const result = await hass.callWS<
		Record<string, Array<Omit<DailyStat, "start"> & { start: number | string }>>
	>({
		type: "recorder/statistics_during_period",
		start_time: new Date(start).toISOString(),
		statistic_ids: [statisticId],
		period: "day",
		types: ["change"],
	});
	return (result[statisticId] ?? []).map((row) => ({
		...row,
		start: typeof row.start === "number" ? row.start : Date.parse(row.start),
	}));
}
