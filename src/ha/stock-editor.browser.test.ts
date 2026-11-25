import { afterEach, describe, expect, it } from "vitest";
import "../cards/filter/section-editor";
import "../cards/room-tile/editor";
import type { StockBasedEditor } from "./stock-editor";
import type { LovelaceCardConfig } from "./types";

/** Stand-in for a stock card editor (hui-area-card-editor, hui-stack-card-editor): records its config. */
class FakeStockEditor extends HTMLElement {
	config?: LovelaceCardConfig;
	hass?: unknown;
	lovelace?: unknown;
	constructor() {
		super();
		this.attachShadow({ mode: "open" }).innerHTML =
			"<ha-form></ha-form><div class='card-config'></div>";
	}
	setConfig(config: LovelaceCardConfig) {
		this.config = config;
	}
	change(config: LovelaceCardConfig) {
		this.dispatchEvent(
			new CustomEvent("config-changed", {
				detail: { config },
				bubbles: true,
				composed: true,
			}),
		);
	}
}
customElements.define("fake-stock-editor", FakeStockEditor);

for (const type of ["area", "vertical-stack"])
	customElements.define(
		`hui-${type}-card`,
		class extends HTMLElement {
			static getConfigElement() {
				return document.createElement("fake-stock-editor");
			}
		},
	);

window.loadCardHelpers = async () => ({
	createCardElement: () => document.createElement("div"),
});

async function mount(tag: string, config: LovelaceCardConfig) {
	const editor = document.createElement(tag) as StockBasedEditor;
	editor.setConfig(config);
	editor.lovelace = { views: [] };
	document.body.append(editor);
	const changes: LovelaceCardConfig[] = [];
	editor.addEventListener("config-changed", (event) =>
		changes.push((event as CustomEvent).detail.config),
	);
	await expect
		.poll(() => editor.shadowRoot?.querySelector("fake-stock-editor"))
		.toBeTruthy();
	const stock = editor.shadowRoot?.querySelector(
		"fake-stock-editor",
	) as FakeStockEditor;
	return { editor, stock, changes };
}

afterEach(() => {
	document.body.replaceChildren();
});

describe("room-tile-card editor", () => {
	const config = {
		type: "custom:room-tile-card",
		area: "kitchen",
		color: "#09848F",
		identity: "photo-large",
		highlight: "neutral",
		highlight_entities: ["light.kuche"],
		features: [{ type: "custom:room-controls", controls: [] }],
		grid_options: { columns: 6 },
	};

	it("hands HA's area card editor the area card's part", async () => {
		const { stock } = await mount("room-tile-card-editor", config);
		expect(stock.config).toEqual({
			type: "area",
			area: "kitchen",
			color: "#09848F",
			features: [{ type: "custom:room-controls", controls: [] }],
			grid_options: { columns: 6 },
		});
		expect(stock.lovelace).toEqual({ views: [] });
	});

	it("keeps our options when the area card editor changes its part", async () => {
		const { stock, changes } = await mount("room-tile-card-editor", config);
		stock.change({ ...stock.config, type: "area", area: "office" });
		expect(changes).toEqual([{ ...config, area: "office" }]);
	});

	it("passes on changes from our own options' form", async () => {
		const { editor, changes } = await mount("room-tile-card-editor", config);
		const value = { ...config, highlight: "room" };
		editor.shadowRoot
			?.querySelector("ha-form")
			?.dispatchEvent(
				new CustomEvent("value-changed", { detail: { value }, bubbles: true }),
			);
		expect(changes).toEqual([value]);
	});
});

describe("filter-section editor", () => {
	const config = {
		type: "custom:filter-section",
		group: "raeume",
		show_for: ["alle", "eg"],
		cards: [{ type: "heading", heading: "EG" }],
	};

	it("hands HA's stack editor the cards, without its title field", async () => {
		const { stock } = await mount("filter-section-editor", config);
		expect(stock.config).toEqual({
			type: "vertical-stack",
			cards: config.cards,
		});
		await expect
			.poll(
				() =>
					getComputedStyle(
						stock.shadowRoot?.querySelector("ha-form") as Element,
					).display,
			)
			.toBe("none");
	});

	it("keeps group and values when the cards change", async () => {
		const { stock, changes } = await mount("filter-section-editor", config);
		const cards = [...config.cards, { type: "tile", entity: "light.a" }];
		stock.change({ type: "vertical-stack", cards });
		expect(changes).toEqual([{ ...config, cards }]);
	});
});
