import { afterEach, describe, expect, it } from "vitest";
import type { HomeAssistant } from "../../ha/types";
import "./forecast-days";
import type { ForecastDaysCard } from "./forecast-days";
import type { DailyForecast } from "./scale";

const FORECAST: DailyForecast[] = [
	{
		datetime: "2026-11-23T00:00:00+01:00",
		condition: "rainy",
		temperature: 8,
		templow: -2.4,
		precipitation_probability: 60,
	},
	{
		datetime: "2026-11-24T00:00:00+01:00",
		condition: "cloudy",
		temperature: 12,
		templow: 4,
	},
];

function mockHass(subscriptions: Record<string, unknown>[]): HomeAssistant {
	return {
		states: {
			"sensor.outdoor": {
				entity_id: "sensor.outdoor",
				state: "3.5",
				attributes: {},
				last_changed: "",
				last_updated: "",
			},
		},
		language: "de",
		connection: {
			subscribeMessage: async <T>(
				callback: (message: T) => void,
				message: Record<string, unknown>,
			) => {
				subscriptions.push(message);
				queueMicrotask(() =>
					callback({ type: "daily", forecast: FORECAST } as T),
				);
				return async () => {};
			},
		},
	};
}

describe("forecast-days-card", () => {
	let card: ForecastDaysCard | undefined;
	afterEach(() => card?.remove());

	it("subscribes to the daily forecast and draws one row per day", async () => {
		const subscriptions: Record<string, unknown>[] = [];
		card = document.createElement("forecast-days-card") as ForecastDaysCard;
		card.setConfig({
			type: "custom:forecast-days-card",
			entity: "weather.home",
			temperature: "sensor.outdoor",
		});
		card.hass = mockHass(subscriptions);
		document.body.append(card);
		await new Promise((resolve) => setTimeout(resolve, 20));
		await card.updateComplete;

		expect(subscriptions).toEqual([
			{
				type: "weather/subscribe_forecast",
				forecast_type: "daily",
				entity_id: "weather.home",
			},
		]);
		const rows = [...(card.shadowRoot?.querySelectorAll(".row") ?? [])];
		expect(
			rows.map((row) => row.textContent?.replace(/\s+/g, " ").trim()),
		).toEqual(["Heute 60 % −2° 8°", "Di 4° 12°"]);
		expect(rows[0].querySelector(".dot")).not.toBeNull();
		expect(rows[1].querySelector(".dot")).toBeNull();
		expect(rows[0].getBoundingClientRect().height).toBe(44);
	});
});
