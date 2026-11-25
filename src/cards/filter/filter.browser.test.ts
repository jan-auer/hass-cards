import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { HomeAssistant, LovelaceCardConfig } from "../../ha/types";
import "./filter-bar";
import "./filter-section";
import type { FilterBar } from "./filter-bar";
import type { FilterSection } from "./filter-section";
import { filterStore } from "./store";

/** Stand-in for any card HA's helpers create: records what it gets, 6 columns × 1 row like a tile. */
class FakeCard extends HTMLElement {
	config?: LovelaceCardConfig;
	hass?: HomeAssistant;
	layout?: string;
	setConfig(config: LovelaceCardConfig) {
		this.config = config;
	}
	getGridOptions() {
		return { columns: 6, rows: 1 };
	}
	/** Hides itself like the stock conditional card does. */
	setVisible(visible: boolean) {
		this.toggleAttribute("hidden", !visible);
		this.style.display = visible ? "" : "none";
		this.dispatchEvent(
			new CustomEvent("card-visibility-changed", {
				bubbles: true,
				composed: true,
				detail: { value: visible },
			}),
		);
	}
}
customElements.define("fake-card", FakeCard);

const hass = { states: {} } as HomeAssistant;
const items = [
	{ name: "Aktiv", value: "aktiv", icon: "mdi:flash" },
	{ type: "separator" },
	{ name: "EG", value: "eg" },
	{ name: "KG", value: "kg" },
];

let created: FakeCard[] = [];
const mounted: HTMLElement[] = [];

beforeEach(() => {
	created = [];
	window.loadCardHelpers = async () => ({
		createCardElement(config: LovelaceCardConfig) {
			const card = document.createElement("fake-card") as FakeCard;
			card.setConfig(config);
			card.style.cssText = "display:block;height:100%";
			created.push(card);
			return card;
		},
	});
});

afterEach(() => {
	for (const element of mounted.splice(0)) element.remove();
	history.pushState(null, "", `/reset-${Math.random()}`);
	window.dispatchEvent(new Event("location-changed"));
});

async function mountBar(group: string): Promise<FilterBar> {
	const bar = document.createElement("filter-bar") as FilterBar;
	bar.setConfig({ type: "custom:filter-bar", group, default: "alle", items });
	bar.hass = hass;
	document.body.append(bar);
	mounted.push(bar);
	await bar.updateComplete;
	return bar;
}

async function mountSection(
	group: string,
	show_for: string[],
	cards: LovelaceCardConfig[] = [
		{ type: "tile", entity: "light.a" },
		{ type: "tile", entity: "light.b" },
	],
): Promise<FilterSection> {
	const section = document.createElement("filter-section") as FilterSection;
	section.setConfig({ type: "custom:filter-section", group, show_for, cards });
	section.hass = hass;
	section.style.width = "400px";
	document.body.append(section);
	mounted.push(section);
	await section.ready;
	await section.updateComplete;
	return section;
}

const pills = (bar: FilterBar) => [
	...(bar.shadowRoot?.querySelectorAll<HTMLButtonElement>("button") ?? []),
];

describe("filter-bar", () => {
	it("shows the items with a divider for a separator, none selected at first", async () => {
		const bar = await mountBar("bar-a");
		expect(pills(bar).map((pill) => pill.textContent?.trim())).toEqual([
			"Aktiv",
			"EG",
			"KG",
		]);
		expect(bar.shadowRoot?.querySelectorAll(".separator")).toHaveLength(1);
		expect(pills(bar).map((pill) => pill.getAttribute("aria-pressed"))).toEqual(
			["false", "false", "false"],
		);
		expect(filterStore.value("bar-a")).toBe("alle");
	});

	it("sets the group's value on tap; tapping the selected item again goes back to the default", async () => {
		const bar = await mountBar("bar-b");
		pills(bar)[1].click();
		expect(filterStore.value("bar-b")).toBe("eg");
		await bar.updateComplete;
		expect(pills(bar).map((pill) => pill.getAttribute("aria-pressed"))).toEqual(
			["false", "true", "false"],
		);
		pills(bar)[1].click();
		expect(filterStore.value("bar-b")).toBe("alle");
		await bar.updateComplete;
		expect(pills(bar).map((pill) => pill.getAttribute("aria-pressed"))).toEqual(
			["false", "false", "false"],
		);
	});
});

describe("filter-section", () => {
	it("shows its cards while the selected value is in show_for, else nothing, and hides itself", async () => {
		const bar = await mountBar("sec-a");
		const section = await mountSection("sec-a", ["alle", "eg"]);
		const events: boolean[] = [];
		section.addEventListener("card-visibility-changed", (event) =>
			events.push((event as CustomEvent).detail.value),
		);
		expect(section.shadowRoot?.querySelectorAll("fake-card")).toHaveLength(2);
		expect(section.hidden).toBe(false);

		pills(bar)[2].click(); // KG
		await section.updateComplete;
		expect(section.shadowRoot?.querySelectorAll("fake-card")).toHaveLength(0);
		expect(section.hidden).toBe(true);

		pills(bar)[1].click(); // EG
		await section.updateComplete;
		expect(section.shadowRoot?.querySelectorAll("fake-card")).toHaveLength(2);
		expect(section.hidden).toBe(false);
		expect(events).toEqual([false, true]);
	});

	it("passes hass to every card and lays them out in the section's 12-column grid", async () => {
		await mountBar("sec-b");
		const section = await mountSection(
			"sec-b",
			["alle"],
			[
				{ type: "tile", entity: "light.a" },
				{ type: "tile", entity: "light.b" },
				{ type: "heading", grid_options: { columns: "full" } },
			],
		);
		expect(created.map((card) => card.hass)).toEqual([hass, hass, hass]);
		const next = { states: {} } as HomeAssistant;
		section.hass = next;
		expect(created.map((card) => card.hass)).toEqual([next, next, next]);
		// Two 6-column cards side by side (8 px gap), the full-width one below; rows 56 px
		const [a, b, heading] = created.map((card) => {
			const box = card.getBoundingClientRect();
			const host = section.getBoundingClientRect();
			return [box.x - host.x, box.y - host.y, box.width, box.height].map(
				Math.round,
			);
		});
		expect(a).toEqual([0, 0, 196, 56]);
		expect(b).toEqual([204, 0, 196, 56]);
		expect(heading?.slice(0, 3)).toEqual([0, 64, 400]);
	});

	it("hides its section when all its cards are hidden, like a stock section", async () => {
		await mountBar("sec-c");
		const section = await mountSection("sec-c", ["alle"]);
		created[0].setVisible(false);
		await section.updateComplete;
		expect(section.hidden).toBe(false);
		created[1].setVisible(false);
		await section.updateComplete;
		expect(section.hidden).toBe(true);
		created[0].setVisible(true);
		await section.updateComplete;
		expect(section.hidden).toBe(false);
	});

	it("shows everything in the editor preview", async () => {
		await mountBar("sec-d");
		const section = await mountSection("sec-d", ["kg"]);
		expect(section.hidden).toBe(true);
		section.preview = true;
		await section.updateComplete;
		expect(section.hidden).toBe(false);
		expect(section.shadowRoot?.querySelectorAll("fake-card")).toHaveLength(2);
	});
});
