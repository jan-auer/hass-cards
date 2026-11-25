import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
	HassEntity,
	HomeAssistant,
	LovelaceCardConfig,
} from "../../ha/types";
import "./room-tile";
import type { RoomTileCard } from "./room-tile";

/** Stand-in for HA's stock area card: records what it gets, sized like the real one. */
class FakeAreaCard extends HTMLElement {
	config?: LovelaceCardConfig;
	hass?: HomeAssistant;
	layout?: string;
	getGridOptions() {
		return { columns: 6, rows: 2, min_columns: 6, min_rows: 2 };
	}
}
customElements.define("fake-area-card", FakeAreaCard);

/** Stand-in for HA's feature row element (hui-card-features): records what it gets. */
class FakeFeatureRow extends HTMLElement {
	hass?: HomeAssistant;
	context?: Record<string, unknown>;
	features?: unknown[];
	position?: string;
}
customElements.define("hui-card-features", FakeFeatureRow);

function entity(
	entity_id: string,
	state: string,
	attributes: Record<string, unknown> = {},
): HassEntity {
	return { entity_id, state, attributes, last_changed: "", last_updated: "" };
}

function mockHass(overrides: Record<string, HassEntity> = {}): HomeAssistant {
	return {
		states: {
			"light.buro": entity("light.buro", "off"),
			"binary_sensor.buro_presence": entity(
				"binary_sensor.buro_presence",
				"off",
				{
					device_class: "occupancy",
				},
			),
			"sensor.buro_t": entity("sensor.buro_t", "22.7"),
			"sensor.buro_h": entity("sensor.buro_h", "39"),
			...overrides,
		},
		areas: {
			buro: {
				area_id: "buro",
				name: "Büro",
				picture: "/api/image/serve/abc/512x512",
				temperature_entity_id: "sensor.buro_t",
				humidity_entity_id: "sensor.buro_h",
			},
			flur: { area_id: "flur", name: "Flur" },
		},
		entities: {
			"binary_sensor.buro_presence": {
				entity_id: "binary_sensor.buro_presence",
				area_id: "buro",
			},
		},
		devices: {},
		themes: { darkMode: false },
		formatEntityState: (state: HassEntity) =>
			state.entity_id === "sensor.buro_t" ? "22,7 °C" : `${state.state} %`,
	};
}

const base = {
	type: "custom:room-tile-card",
	area: "buro",
	color: "#983E4A",
	alert_classes: ["occupancy"],
	features_position: "bottom",
	features: [
		{ type: "custom:room-controls", controls: [{ entity: "light.buro" }] },
	],
	tap_action: { action: "navigate", navigation_path: "/lovelace/buro" },
};

let card: RoomTileCard;
let inner: FakeAreaCard;

beforeEach(() => {
	window.loadCardHelpers = async () => ({
		createCardElement(config: LovelaceCardConfig) {
			inner = document.createElement("fake-area-card") as FakeAreaCard;
			inner.config = config;
			inner.style.display = "block";
			inner.style.height =
				config.features_position === "inline" ? "56px" : "120px";
			return inner;
		},
	});
});

afterEach(() => card?.remove());

async function mount(
	config: Record<string, unknown>,
	hass = mockHass(),
): Promise<RoomTileCard> {
	card = document.createElement("room-tile-card") as RoomTileCard;
	card.setConfig({ ...base, ...config });
	card.hass = hass;
	card.style.width = "176px";
	document.body.append(card);
	await card.ready;
	await card.updateComplete;
	return card;
}

const $ = (selector: string) =>
	card.shadowRoot?.querySelector<HTMLElement>(selector) ?? null;
const box = (element: HTMLElement | null) => {
	const host = card.getBoundingClientRect();
	const rect = (element as HTMLElement).getBoundingClientRect();
	return [rect.x - host.x, rect.y - host.y, rect.width, rect.height].map(
		Math.round,
	);
};

describe("room-tile-card", () => {
	it("wraps a stock area card with the config minus its own options, and passes hass on", async () => {
		const hass = mockHass();
		await mount(
			{
				identity: "strip",
				highlight: "room",
				highlight_entities: ["light.buro"],
			},
			hass,
		);
		expect(inner.config).toEqual({
			type: "area",
			display_type: "compact",
			area: "buro",
			color: "#983E4A",
			alert_classes: ["occupancy"],
			features_position: "bottom",
			features: base.features,
			tap_action: base.tap_action,
		});
		expect(inner.hass).toBe(hass);
		const next = mockHass();
		card.hass = next;
		expect(inner.hass).toBe(next);
		expect(card.getGridOptions()).toEqual(inner.getGridOptions());
	});

	it("tints the card in the room colour while a highlight entity is active", async () => {
		await mount({ highlight: "room", highlight_entities: ["light.buro"] });
		expect(inner.style.getPropertyValue("--ha-card-background")).toBe("");
		card.hass = mockHass({ "light.buro": entity("light.buro", "on") });
		await card.updateComplete;
		expect(inner.style.getPropertyValue("--ha-card-background")).toContain(
			"rgba(152, 62, 74, 0.16)",
		);
		expect(inner.style.getPropertyValue("--ha-card-box-shadow")).toContain(
			"inset 0 0 0 1px rgba(152, 62, 74, 0.42)",
		);
	});

	it("tints in a warm tone with `warm`, never with `none`", async () => {
		const on = mockHass({ "light.buro": entity("light.buro", "on") });
		await mount({ highlight: "warm", highlight_entities: ["light.buro"] }, on);
		expect(inner.style.getPropertyValue("--ha-card-background")).toContain(
			"rgba(255, 149, 0, 0.13)",
		);
		card.remove();
		await mount({ highlight: "none", highlight_entities: ["light.buro"] }, on);
		expect(inner.style.getPropertyValue("--ha-card-background")).toBe("");
	});

	it("draws a colour strip along the left edge with `strip`", async () => {
		await mount({ identity: "strip" });
		expect(box($(".strip"))).toEqual([0, 0, 4, 120]);
		expect(getComputedStyle($(".strip") as HTMLElement).backgroundColor).toBe(
			"rgb(152, 62, 74)",
		);
		card.remove();
		await mount({ identity: "none" });
		expect($(".strip")).toBeNull();
		expect($(".photo")).toBeNull();
	});

	it("puts the area's photo over the stock icon, its left edge on the feature row's, in the tile and in the row", async () => {
		await mount({ identity: "photo" });
		expect(box($(".photo"))).toEqual([12, 15, 36, 36]);
		expect(($(".photo") as HTMLElement).style.backgroundImage).toContain(
			"/api/image/serve/abc/512x512",
		);
		card.remove();
		await mount({ identity: "photo", features_position: "inline" });
		expect(box($(".photo"))).toEqual([12, 10, 36, 36]);
		card.remove();
		await mount({ identity: "photo", image: "/local/rooms/buro.jpg" });
		expect(($(".photo") as HTMLElement).style.backgroundImage).toContain(
			"/local/rooms/buro.jpg",
		);
	});

	it("keeps the stock icon when the area has no photo", async () => {
		await mount({ identity: "photo", area: "flur" });
		expect($(".photo")).toBeNull();
	});

	it("shows the presence badge on the photo, like the stock badge on the icon", async () => {
		await mount({ identity: "photo" });
		expect($(".badge")).toBeNull();
		card.hass = mockHass({
			"binary_sensor.buro_presence": entity(
				"binary_sensor.buro_presence",
				"on",
				{
					device_class: "occupancy",
				},
			),
		});
		await card.updateComplete;
		expect(box($(".badge"))).toEqual([35, 12, 16, 16]);
		expect($(".badge ha-icon")?.getAttribute("icon")).toBe("mdi:home");
	});

	// A bigger photo as an option beside the 36 px one: own header, HA's own feature row element below it.
	it("photo-large: own header with a 42 px photo on the feature row's inset, name and the area's sensors", async () => {
		await mount({
			identity: "photo-large",
			sensor_classes: ["temperature", "humidity"],
		});
		// A 2-row grid cell, the feature row 42 px high as HA draws it
		card.style.height = "120px";
		($("hui-card-features") as HTMLElement).style.cssText =
			"display:block;height:42px";
		expect(box($(".large .photo"))).toEqual([12, 12, 42, 42]);
		expect($(".large .name")?.textContent).toBe("Büro");
		expect($(".large .sensors")?.textContent).toBe("22,7 °C · 39 %");
	});

	it("photo-large: HA's feature row gets the features, the area and hass; a tap runs the card's action", async () => {
		const actions: unknown[] = [];
		document.body.addEventListener("hass-action", (event) =>
			actions.push((event as CustomEvent).detail.config.tap_action),
		);
		const hass = mockHass();
		await mount({ identity: "photo-large" }, hass);
		const row = $("hui-card-features") as FakeFeatureRow;
		expect(row.features).toEqual(base.features);
		expect(row.context).toEqual({ area_id: "buro", exclude_entities: [] });
		expect(row.hass).toBe(hass);
		expect(row.position).toBe("bottom");
		($(".large") as HTMLElement).click();
		expect(actions).toEqual([base.tap_action]);
	});

	it("photo-large: the feature row lets taps through to the card, which ripples like a stock tile", async () => {
		await mount({ identity: "photo-large" });
		expect(
			getComputedStyle($("hui-card-features") as Element).pointerEvents,
		).toBe("none");
		expect($(".large ha-ripple")).not.toBeNull();
	});
});
