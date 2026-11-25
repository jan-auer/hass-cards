/** One day of HA's daily forecast (`weather/subscribe_forecast`); `temperature` is the high. */
export interface DailyForecast {
	datetime: string;
	condition?: string;
	temperature: number;
	templow?: number;
	precipitation_probability?: number;
}

/** A row ready to draw: bar edges and the dot as % of the shared scale. */
export interface DayRow {
	day: DailyForecast;
	low: number;
	high: number;
	left: number;
	right: number;
	dot?: number;
	rain?: number;
}

/** Below this the rain chance isn't worth a label. */
const RAIN_SHOWN_FROM = 30;

/**
 * The shown days on one shared scale from the lowest low to the highest high; the current
 * temperature widens it so today's dot stays on the bar.
 */
export function dayRows(
	forecast: DailyForecast[],
	days: number | undefined,
	current: number | undefined,
): DayRow[] {
	const shown = forecast.slice(0, days ?? forecast.length);
	const lows = shown.map((day) => day.templow ?? day.temperature);
	const highs = shown.map((day) => day.temperature);
	const extra = current === undefined ? [] : [current];
	const bottom = Math.min(...lows, ...extra);
	const span = Math.max(...highs, ...extra) - bottom || 1;
	const at = (value: number) => ((value - bottom) / span) * 100;
	return shown.map((day, index) => {
		const probability = day.precipitation_probability;
		return {
			day,
			low: lows[index],
			high: highs[index],
			left: at(lows[index]),
			right: 100 - at(highs[index]),
			dot: index === 0 && current !== undefined ? at(current) : undefined,
			rain:
				probability !== undefined && probability >= RAIN_SHOWN_FROM
					? probability
					: undefined,
		};
	});
}

/** "Heute" for the first day, else the short weekday without the dot ("Di", "Mi"). */
export function dayLabel(
	datetime: string,
	index: number,
	language: string,
): string {
	if (index === 0) return "Heute";
	return new Date(datetime)
		.toLocaleDateString(language, { weekday: "short" })
		.replace(".", "");
}

/** Whole degrees with a real minus sign. */
export function degrees(value: number): string {
	return `${Math.round(value)}°`.replace("-", "−");
}
