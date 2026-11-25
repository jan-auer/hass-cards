// README screenshots: every card with the demo house, light and dark, written to images/<slug>-<mode>.png.
// Run with `npm run screenshots`. Room tile and vacuum tile need HA's own elements; see scripts/live-screenshots.mjs.
import "./ha-elements";
import "../src/cards/weather/weather";
import "../src/cards/forecast-days/forecast-days";
import "../src/cards/rain/rain";
import "../src/cards/wind/wind-card";
import "../src/cards/level/level";
import "../src/cards/upcoming-pickups/upcoming-pickups";
import "../src/cards/tab-bar/tab-bar";
import "../src/cards/filter/filter-bar";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { filterStore } from "../src/cards/filter/store";
import type { HomeAssistant, LovelaceCardConfig } from "../src/ha/types";
import { demoHass, NOW, type Weather } from "./demo-hass";
import { createStage, type Mode, STAGE_PADDING } from "./stage";

/** Any of our cards, as HA drives it. */
type Card = HTMLElement & {
	setConfig(config: LovelaceCardConfig): void;
	hass?: HomeAssistant;
	updateComplete?: Promise<boolean>;
};

/** HA's sections grid on a phone: 12 columns over 358 px, 56 px rows, 8 px gaps. */
const FULL_WIDTH = 358;
const HALF_WIDTH = (FULL_WIDTH - 8) / 2;
const rows = (count: number) => count * 56 + (count - 1) * 8;

interface Placement {
	config: LovelaceCardConfig;
	width: number;
	/** Grid rows; the card's own height when left out. */
	rows?: number;
	weather?: Weather;
}

interface Shot {
	slug: string;
	/** The width the cards are laid out in. */
	width: number;
	cards: Placement[];
	/** The rendered card has its data (async statistics, forecast subscription). */
	ready?: (root: ShadowRoot) => boolean;
	/** Instead of the flowing grid: put the cards into this element (the tab bar's fixed frame). */
	frame?: (stage: HTMLElement) => HTMLElement;
}

const WEATHER = {
	type: "custom:weather-summary-card",
	temperature: "sensor.outdoor_temperature",
	humidity: "sensor.outdoor_humidity",
	condition: "weather.forecast_home",
	rain_state: "binary_sensor.rain",
	rain_rate: "sensor.rain_rate",
	rain_today: "sensor.rain_today",
};

const SHOTS: Shot[] = [
	{
		slug: "weather",
		width: FULL_WIDTH,
		cards: [
			{ config: { ...WEATHER, layout: "half" }, width: HALF_WIDTH, rows: 2 },
			{
				config: { ...WEATHER, layout: "half" },
				width: HALF_WIDTH,
				rows: 2,
				weather: "raining",
			},
			{ config: { ...WEATHER, layout: "full" }, width: FULL_WIDTH, rows: 2 },
		],
		ready: (root) => root.querySelector("polyline") !== null,
	},
	{
		slug: "forecast-days",
		width: FULL_WIDTH,
		cards: [
			{
				config: {
					type: "custom:forecast-days-card",
					entity: "weather.forecast_home",
					temperature: "sensor.outdoor_temperature",
				},
				width: FULL_WIDTH,
			},
		],
		ready: (root) => root.querySelectorAll(".row").length === 7,
	},
	{
		slug: "rain",
		width: FULL_WIDTH,
		cards: [
			{
				config: {
					type: "custom:rain-card",
					rate: "sensor.rain_rate",
					raining: "binary_sensor.rain",
					today: "sensor.rain_today",
					rows: [
						{ entity: "sensor.rain_event", name: "Ereignis" },
						{ entity: "sensor.rain_24h", name: "24 h" },
						{ entity: "sensor.rain_week", name: "Woche" },
						{ entity: "sensor.rain_month", name: "Monat" },
					],
				},
				width: FULL_WIDTH,
				rows: 4,
				weather: "raining",
			},
		],
		ready: (root) => root.querySelector("rect.bar") !== null,
	},
	{
		slug: "wind",
		width: FULL_WIDTH,
		cards: [
			{
				config: {
					type: "custom:wind-card",
					speed: "sensor.wind_speed",
					gust: "sensor.wind_gust",
					direction: "sensor.wind_direction",
					direction_avg: "sensor.wind_direction_10m_avg",
					max_today: "sensor.wind_gust_max_today",
				},
				width: FULL_WIDTH,
				rows: 3,
			},
		],
	},
	{
		slug: "level",
		width: FULL_WIDTH,
		cards: [
			{
				config: {
					type: "custom:level-card",
					entity: "sensor.uv_index",
					name: "UV-Index",
					icon: "mdi:weather-sunny",
					max: 11,
					levels: [
						{ from: 0, word: "niedrig", color: "#34C759" },
						{ from: 3, word: "mäßig", color: "#FFCC00" },
						{ from: 6, word: "hoch", color: "#FF9500" },
						{ from: 8, word: "sehr hoch", color: "#FF3B30" },
						{ from: 11, word: "extrem", color: "#AF52DE" },
					],
				},
				width: FULL_WIDTH,
				rows: 2,
			},
		],
	},
	{
		slug: "upcoming-pickups",
		width: HALF_WIDTH,
		cards: [
			{
				config: {
					type: "custom:upcoming-pickups-card",
					entity: "binary_sensor.waste_pickup",
				},
				width: HALF_WIDTH,
				rows: 2,
			},
		],
	},
	{
		slug: "tab-bar",
		width: FULL_WIDTH,
		cards: [
			{
				config: {
					type: "custom:floating-tab-bar",
					tabs: [
						{
							path: "home",
							icon: "mdi:home-outline",
							active_icon: "mdi:home",
							label: "Home",
						},
						{ path: "rooms", icon: "mdi:sofa-outline", label: "Räume" },
						{
							path: "weather",
							icon: "mdi:weather-partly-cloudy",
							label: "Wetter",
						},
						{ path: "climate", icon: "mdi:thermometer", label: "Klima" },
						{ path: "settings", icon: "mdi:tune-variant", label: "Haus" },
					],
				},
				width: FULL_WIDTH,
			},
		],
		// The bar is `position: fixed`; a transformed frame is the containing block for fixed descendants,
		// so the bar sits above the frame's bottom edge instead of the viewport's. The frame spans the whole
		// stage from the viewport's left edge, since the bar centres itself on viewport coordinates.
		frame: (stage) => {
			const frame = document.createElement("div");
			Object.assign(frame.style, {
				position: "relative",
				transform: "translateZ(0)",
				height: "120px",
				margin: `0 -${STAGE_PADDING}px`,
				padding: `0 ${STAGE_PADDING}px`,
			});
			frame.style.setProperty("--floating-tab-bar-bottom", "32px");
			stage.style.paddingTop = stage.style.paddingBottom = "0";
			stage.append(frame);
			return frame;
		},
	},
	{
		slug: "filter",
		width: FULL_WIDTH,
		cards: [
			{
				config: {
					type: "custom:filter-bar",
					group: "screenshot-rooms",
					default: "alle",
					items: [
						{ name: "Aktiv", value: "aktiv", icon: "mdi:flash" },
						{ type: "separator" },
						{ name: "EG", value: "eg" },
						{ name: "OG", value: "og" },
						{ name: "KG", value: "kg" },
					],
				},
				width: FULL_WIDTH,
			},
		],
	},
];

async function mountCard(
	parent: HTMLElement,
	placement: Placement,
	mode: Mode,
): Promise<Card> {
	const tag = String(placement.config.type).replace(/^custom:/, "");
	const card = document.createElement(tag) as Card;
	card.setConfig(placement.config);
	card.hass = demoHass(mode, placement.weather);
	card.style.width = `${placement.width}px`;
	if (placement.rows) card.style.height = `${rows(placement.rows)}px`;
	parent.append(card);
	await card.updateComplete;
	return card;
}

async function settle(): Promise<void> {
	await document.fonts.ready;
	await new Promise((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(resolve)),
	);
}

describe("README screenshots", () => {
	const startPath = location.pathname;

	beforeAll(() => {
		// Only Date: the cards' own timers and Lit's scheduling keep running.
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(NOW);
		// The tab bar's active tab follows the URL: the dashboard's first view.
		history.replaceState(null, "", "/lovelace/home");
		filterStore.select("screenshot-rooms", "eg");
	});

	afterAll(() => {
		vi.useRealTimers();
		history.replaceState(null, "", startPath);
	});

	for (const shot of SHOTS)
		for (const mode of ["light", "dark"] as const)
			it(`${shot.slug} (${mode})`, async () => {
				const stage = createStage(mode, shot.width);
				try {
					const parent = shot.frame?.(stage) ?? stage;
					Object.assign(parent.style, {
						display: shot.frame ? "block" : "flex",
						flexWrap: "wrap",
						gap: "8px",
					});
					const cards: Card[] = [];
					for (const placement of shot.cards)
						cards.push(await mountCard(parent, placement, mode));
					const ready = shot.ready;
					if (ready)
						await vi.waitFor(() => {
							for (const card of cards)
								expect(card.shadowRoot && ready(card.shadowRoot)).toBe(true);
						});
					await Promise.all(cards.map((card) => card.updateComplete));
					await settle();
					await page.screenshot({
						element: stage,
						path: `../images/${shot.slug}-${mode}.png`,
					});
				} finally {
					stage.remove();
				}
			});
});
