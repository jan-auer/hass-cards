import { afterEach, describe, expect, it, vi } from "vitest";
import type { HassEntity, HomeAssistant } from "../../ha/types";
import { CONDITION_WORDS } from "./condition";
import "./weather";
import type { WeatherSummaryCard } from "./weather";

function entity(entity_id: string, state: string, unit?: string): HassEntity {
	return {
		entity_id,
		state,
		attributes: unit ? { unit_of_measurement: unit } : {},
		last_changed: "2026-11-21T10:00:00Z",
		last_updated: "2026-11-21T10:00:00Z",
	};
}

const midnight = new Date();
midnight.setHours(0, 0, 0, 0);
const statistics = {
	"sensor.temp": [
		{ start: midnight.getTime(), mean: 9.5, min: 9.1, max: 10 },
		{ start: midnight.getTime() + 3_600_000, mean: 12, min: 10, max: 12.9 },
	],
	"sensor.rain_rate": [],
};

function mockHass(
	raining: boolean,
	extra: Record<string, HassEntity> = {},
): HomeAssistant {
	return {
		language: "de",
		states: {
			"sensor.temp": entity("sensor.temp", "10.6", "°C"),
			"sensor.hum": entity("sensor.hum", "63", "%"),
			"weather.nwp": entity("weather.nwp", raining ? "rainy" : "clear-night"),
			"binary_sensor.rain": entity(
				"binary_sensor.rain",
				raining ? "on" : "off",
			),
			"sensor.rain_rate": entity(
				"sensor.rain_rate",
				raining ? "2.4" : "0",
				"mm/h",
			),
			"sensor.elsewhere": entity("sensor.elsewhere", "1"),
			...extra,
		},
		callWS: vi.fn(async () => statistics),
	} as HomeAssistant;
}

const config = {
	type: "custom:weather-summary-card",
	layout: "half",
	temperature: "sensor.temp",
	humidity: "sensor.hum",
	condition: "weather.nwp",
	rain_state: "binary_sensor.rain",
	rain_rate: "sensor.rain_rate",
};

let card: WeatherSummaryCard;

async function mount(hass: HomeAssistant): Promise<WeatherSummaryCard> {
	card = document.createElement("weather-summary-card") as WeatherSummaryCard;
	card.setConfig(config);
	card.hass = hass;
	document.body.append(card);
	await vi.waitFor(() =>
		expect(card.shadowRoot?.querySelector("polyline")).not.toBeNull(),
	);
	await card.updateComplete;
	return card;
}

// The parts are spaced with a flex gap, not text spaces.
const line = () =>
	card.shadowRoot
		?.querySelector(".line")
		?.textContent?.replace(/\s+/g, " ")
		.replace(/\s*·\s*/g, " · ")
		.trim();

// Temperature, humidity and today's measured high/low; while it rains, the rain rate takes the line and high/low
// step aside. Rain never tints the card.
describe("weather-summary-card", () => {
	afterEach(() => card?.remove());

	it("shows humidity with today's measured high and low while it's dry", async () => {
		await mount(mockHass(false));
		expect(card.shadowRoot?.querySelector(".temperature")?.textContent).toBe(
			"10,6°",
		);
		expect(line()).toBe("63 % · ↑13° ↓9°");
	});

	it("puts the rain rate in the line while it rains", async () => {
		await mount(mockHass(true));
		expect(line()).toBe("2,4 mm/h · 63 %");
	});

	// The piezo stays "on" while the sensor is wet after rain; only a rate above 0 counts as raining.
	it("keeps high and low while the piezo is still wet at 0 mm/h", async () => {
		await mount(
			mockHass(false, {
				"binary_sensor.rain": entity("binary_sensor.rain", "on"),
			}),
		);
		expect(line()).toBe("63 % · ↑13° ↓9°");
	});

	// Full width: 40 px icon beside the temperature, condition · humidity, then high/low.
	it("puts the 40 px icon beside the temperature at full width", async () => {
		card = document.createElement("weather-summary-card") as WeatherSummaryCard;
		card.setConfig({
			...config,
			layout: "full",
			rain_today: "sensor.rain_today",
		});
		card.hass = mockHass(false, {
			"sensor.rain_today": entity("sensor.rain_today", "3.1", "mm"),
		});
		document.body.append(card);
		await vi.waitFor(() =>
			expect(card.shadowRoot?.querySelector("polyline")).not.toBeNull(),
		);
		await card.updateComplete;
		const head = card.shadowRoot?.querySelector(".full .head");
		expect(head?.querySelector("svg")?.getAttribute("width")).toBe("40");
		expect(head?.querySelector(".temperature")?.textContent).toBe("10,6°");
		const lines = [
			...(card.shadowRoot?.querySelectorAll(".full .text .line") ?? []),
		];
		const text = (element?: Element) =>
			element?.textContent
				?.replace(/\s+/g, " ")
				.replace(/\s*·\s*/g, " · ")
				.trim();
		expect(lines.map(text)).toEqual(["Klar · 63 %", "H 12,9° · T 9,1°"]);
		expect(lines[0]?.querySelector("svg")).toBeNull();
	});

	it("shows the rain rate and today's rain at full width while it rains", async () => {
		card = document.createElement("weather-summary-card") as WeatherSummaryCard;
		card.setConfig({
			...config,
			layout: "full",
			rain_today: "sensor.rain_today",
		});
		card.hass = mockHass(true, {
			"sensor.rain_today": entity("sensor.rain_today", "3.1", "mm"),
		});
		document.body.append(card);
		await vi.waitFor(() =>
			expect(card.shadowRoot?.querySelector("polyline")).not.toBeNull(),
		);
		await card.updateComplete;
		const lines = [
			...(card.shadowRoot?.querySelectorAll(".full .text .line") ?? []),
		];
		expect(
			lines.map((element) =>
				element.textContent
					?.replace(/\s+/g, " ")
					.replace(/\s*·\s*/g, " · ")
					.trim(),
			),
		).toEqual(["2,4 mm/h · 63 %", "3,1 mm heute"]);
	});

	it("keeps the humidity whole at full width when the condition word is long", async () => {
		const word = CONDITION_WORDS.exceptional;
		CONDITION_WORDS.exceptional = "Außergewöhnlich starkes Unwetter";
		try {
			card = document.createElement(
				"weather-summary-card",
			) as WeatherSummaryCard;
			card.setConfig({ ...config, layout: "full" });
			card.hass = mockHass(false, {
				"weather.nwp": entity("weather.nwp", "exceptional"),
			});
			document.body.append(card);
			await vi.waitFor(() =>
				expect(card.shadowRoot?.querySelector("polyline")).not.toBeNull(),
			);
			await card.updateComplete;
			const first = card.shadowRoot?.querySelector(
				".full .first",
			) as HTMLElement;
			const percent = [...first.childNodes].find((node) =>
				node.textContent?.includes("%"),
			) as Node;
			const range = document.createRange();
			range.selectNodeContents(percent);
			expect(range.getBoundingClientRect().right).toBeLessThanOrEqual(
				first.getBoundingClientRect().right,
			);
		} finally {
			CONDITION_WORDS.exceptional = word;
		}
	});

	it("rings the now dot in the card's background, whatever the theme", async () => {
		await mount(mockHass(false));
		card.style.setProperty("--card-background-color", "rgb(1, 2, 3)");
		const now = card.shadowRoot?.querySelector(".spark .now") as Element;
		expect(getComputedStyle(now).stroke).toBe("rgb(1, 2, 3)");
	});

	it("colours the weather icon with HA's weather icon variables", async () => {
		await mount(mockHass(false));
		card.style.setProperty("--weather-icon-moon-color", "rgb(4, 5, 6)");
		const moon = card.shadowRoot?.querySelector(".weather-icon .moon");
		expect(moon).not.toBeNull();
		expect(getComputedStyle(moon as Element).fill).toBe("rgb(4, 5, 6)");
	});

	it("fills its grid cell like stock cards", async () => {
		const cell = document.createElement("div");
		cell.style.height = "140px";
		document.body.append(cell);
		await mount(mockHass(false));
		cell.append(card);
		await card.updateComplete;
		const haCard = card.shadowRoot?.querySelector("ha-card") as HTMLElement;
		expect(haCard.getBoundingClientRect().height).toBe(140);
		cell.remove();
	});

	it("re-renders only when one of its own entities changes", async () => {
		const hass = mockHass(false);
		await mount(hass);
		const render = vi.spyOn(
			card,
			"render" as keyof WeatherSummaryCard & "render",
		);
		card.hass = {
			...hass,
			states: {
				...hass.states,
				"sensor.elsewhere": entity("sensor.elsewhere", "2"),
			},
		};
		await card.updateComplete;
		expect(render).not.toHaveBeenCalled();
		card.hass = {
			...hass,
			states: {
				...hass.states,
				"sensor.temp": entity("sensor.temp", "10.8", "°C"),
			},
		};
		await card.updateComplete;
		expect(render).toHaveBeenCalledTimes(1);
	});
});
