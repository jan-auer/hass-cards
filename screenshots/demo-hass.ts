import type { HassEntity, HomeAssistant } from "../src/ha/types";
import type { Mode } from "./stage";

/**
 * A made-up house for the README screenshots: neutral entity ids and plausible late-November readings.
 * Everything is relative to `NOW`, which the spec freezes the clock at.
 */
export const NOW = new Date(2026, 10, 25, 14, 30);

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function entity(
	entity_id: string,
	state: string,
	attributes: Record<string, unknown> = {},
	changed = NOW,
): HassEntity {
	return {
		entity_id,
		state,
		attributes,
		last_changed: changed.toISOString(),
		last_updated: changed.toISOString(),
	};
}

const unit = (unit_of_measurement: string) => ({ unit_of_measurement });

/** `YYYY-MM-DD` of the day `days` after NOW. */
function localDate(days: number): string {
	const date = new Date(
		NOW.getFullYear(),
		NOW.getMonth(),
		NOW.getDate() + days,
	);
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const STATES: HassEntity[] = [
	entity(
		"sensor.outdoor_temperature",
		"8.4",
		unit("°C"),
		new Date(NOW.getTime() - 5 * 60_000),
	),
	entity("sensor.outdoor_humidity", "71", unit("%")),
	entity("weather.forecast_home", "partlycloudy"),
	entity("sun.sun", "above_horizon"),
	entity("binary_sensor.rain", "off"),
	entity("sensor.rain_rate", "0", unit("mm/h")),
	entity("sensor.rain_today", "0", unit("mm")),
	entity("sensor.rain_event", "0", unit("mm")),
	entity("sensor.rain_24h", "1.6", unit("mm")),
	entity("sensor.rain_week", "9.8", unit("mm")),
	entity("sensor.rain_month", "41.2", unit("mm")),
	entity("sensor.rain_year", "612.4", unit("mm")),
	entity("sensor.wind_speed", "14.3", unit("km/h")),
	entity("sensor.wind_gust", "23.8", unit("km/h")),
	entity("sensor.wind_direction", "242", unit("°")),
	entity("sensor.wind_direction_10m_avg", "236", unit("°")),
	entity("sensor.wind_gust_max_today", "31.5", unit("km/h")),
	entity("sensor.uv_index", "4", { friendly_name: "UV-Index" }),
	entity("binary_sensor.waste_pickup", "off", {
		termine: [
			{ art: "Restmüll", datum: localDate(1) },
			{ art: "Altpapier", datum: localDate(3) },
			{ art: "Gelber Sack", datum: localDate(8) },
		],
		erledigt: false,
	}),
];

/** The same house while it rains: a light shower since late morning. */
const RAINING: HassEntity[] = [
	entity("weather.forecast_home", "rainy"),
	entity(
		"binary_sensor.rain",
		"on",
		{},
		new Date(NOW.getTime() - 2 * HOUR - 45 * 60_000),
	),
	entity("sensor.rain_rate", "1.2", unit("mm/h")),
	entity("sensor.rain_today", "3.4", unit("mm")),
	entity("sensor.rain_event", "3.4", unit("mm")),
	entity("sensor.rain_24h", "5.0", unit("mm")),
	entity("sensor.outdoor_humidity", "93", unit("%")),
];

/** Hourly temperature statistics for the last 24 h: cool night, a low before sunrise, mild afternoon. */
function temperatureHours() {
	const end = new Date(NOW);
	end.setMinutes(0, 0, 0);
	return Array.from({ length: 24 }, (_, index) => {
		const start = end.getTime() - (24 - index) * HOUR;
		const hour = new Date(start).getHours() + 0.5;
		const mean = 5.2 + 3.2 * Math.cos(((hour - 14) / 24) * 2 * Math.PI);
		return { start, mean, min: mean - 0.4, max: mean + 0.4 };
	});
}

/** Hourly rain-rate statistics: the last three hours wet while it rains. */
function rainHours(weather: Weather) {
	return temperatureHours().map(({ start }, index) => ({
		start,
		mean: 0,
		min: 0,
		max: weather === "raining" && index >= 21 ? [0.6, 1.4, 1.0][index - 21] : 0,
	}));
}

/** Daily rain totals for the 13 days before today, oldest first (mm). */
const DAILY_RAIN = [0, 2.1, 6.4, 0.3, 0, 0, 0, 1.2, 8.6, 4.0, 0, 0, 1.6];

function dailyRain() {
	const today = new Date(NOW);
	today.setHours(0, 0, 0, 0);
	return DAILY_RAIN.map((change, index) => ({
		start: today.getTime() - (DAILY_RAIN.length - index) * DAY,
		change,
	}));
}

const FORECAST = [
	["partlycloudy", 9, 2, 10],
	["rainy", 7, 3, 80],
	["cloudy", 6, 1, 20],
	["sunny", 8, -2, 0],
	["sunny", 10, -1, 0],
	["partlycloudy", 9, 2, 30],
	["snowy-rainy", 4, 0, 60],
] as const;

function dailyForecast() {
	return FORECAST.map(([condition, temperature, templow, rain], index) => ({
		datetime: `${localDate(index)}T00:00:00+01:00`,
		condition,
		temperature,
		templow,
		precipitation_probability: rain,
	}));
}

export type Weather = "dry" | "raining";

/** The demo `hass` in HA's light or dark mode, dry or during the shower. */
export function demoHass(mode: Mode, weather: Weather = "dry"): HomeAssistant {
	const states = Object.fromEntries(
		[...STATES, ...(weather === "raining" ? RAINING : [])].map((state) => [
			state.entity_id,
			state,
		]),
	);
	return {
		states,
		language: "de",
		locale: { language: "de" },
		themes: { darkMode: mode === "dark" },
		async callWS<T>(message: Record<string, unknown>): Promise<T> {
			const ids = message.statistic_ids as string[];
			const rows: Record<string, unknown[]> = {};
			for (const id of ids) {
				if (message.period === "day") rows[id] = dailyRain();
				else if (id === "sensor.rain_rate") rows[id] = rainHours(weather);
				else rows[id] = temperatureHours();
			}
			return rows as T;
		},
		connection: {
			async subscribeMessage<T>(callback: (message: T) => void) {
				queueMicrotask(() =>
					callback({ type: "daily", forecast: dailyForecast() } as T),
				);
				return async () => {};
			},
		},
	};
}
