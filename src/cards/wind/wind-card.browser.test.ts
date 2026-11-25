import { afterEach, describe, expect, it } from "vitest";
import type { HassEntity, HomeAssistant } from "../../ha/types";
import "./wind-card";
import { STUB_ENTITIES } from "./config";
import type { WindCard } from "./wind-card";

function entity(entity_id: string, state: string, unit?: string): HassEntity {
	return {
		entity_id,
		state,
		attributes: unit ? { unit_of_measurement: unit } : {},
		last_changed: "",
		last_updated: "",
	};
}

function mockHass(states: Record<string, [string, string?]>): HomeAssistant {
	return {
		states: Object.fromEntries(
			Object.entries(states).map(([id, [state, unit]]) => [
				id,
				entity(id, state, unit),
			]),
		),
		locale: { language: "de" },
	};
}

async function mount(hass: HomeAssistant): Promise<WindCard> {
	const card = document.createElement("wind-card") as WindCard;
	card.setConfig({ type: "custom:wind-card", ...STUB_ENTITIES });
	card.hass = hass;
	document.body.append(card);
	await card.updateComplete;
	return card;
}

function rows(card: WindCard): string[][] {
	return [...(card.shadowRoot?.querySelectorAll(".row") ?? [])].map((row) =>
		[...row.children].map((cell) => cell.textContent?.trim() ?? ""),
	);
}

afterEach(() => {
	document.body.innerHTML = "";
});

describe("wind-card", () => {
	it("shows speed, gusts, directions, today's peak and Beaufort", async () => {
		const card = await mount(
			mockHass({
				"sensor.wind_speed": ["15.2", "km/h"],
				"sensor.wind_gust": ["24.5", "km/h"],
				"sensor.wind_direction": ["130", "°"],
				"sensor.wind_direction_10m_avg": ["126", "°"],
				"sensor.wind_gust_max_today": ["26.3", "km/h"],
			}),
		);
		expect(card.shadowRoot?.querySelector(".speed")?.textContent).toBe("15");
		expect(rows(card)).toEqual([
			["Böen", "24,5 km/h"],
			["Richtung", "SO · 130°"],
			["Mittel 10 min", "SO · 126°"],
			["Spitze heute", "26,3 km/h"],
			["Beaufort", "3 · schwach"],
		]);
		expect(card.shadowRoot?.querySelector(".arrow")).not.toBeNull();
	});

	it("shows a dash and no arrow while values are missing", async () => {
		const card = await mount(
			mockHass({
				"sensor.wind_speed": ["unavailable"],
				"sensor.wind_direction": ["unknown"],
			}),
		);
		expect(card.shadowRoot?.querySelector(".speed")?.textContent).toBe("–");
		expect(rows(card).map(([, value]) => value)).toEqual([
			"–",
			"–",
			"–",
			"–",
			"–",
		]);
		expect(card.shadowRoot?.querySelector(".arrow")).toBeNull();
	});
});
