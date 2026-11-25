import { describe, expect, it } from "vitest";
import type { HomeAssistant, LovelaceCardConfig } from "./ha/types";
import "./index";

// Every card and feature can be added from HA's pickers and edited in its visual editor.
interface EditableElement {
	getConfigForm?(): { schema: unknown[] };
	getConfigElement?(): unknown;
	getStubConfig?(hass: HomeAssistant): Partial<LovelaceCardConfig>;
}

const hass = {
	states: {},
	areas: { kitchen: { area_id: "kitchen", name: "Küche" } },
} as unknown as HomeAssistant;

// jsdom has no ResizeObserver; the weather and tab-bar cards observe their size.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
};

// room-tile and filter-section create stock cards through HA's card helpers.
window.loadCardHelpers = async () => ({
	createCardElement: () => document.createElement("div"),
});

const elements = [
	...(window.customCards ?? []).map((card) => card.type),
	...(window.customCardFeatures ?? []).map((feature) => feature.type),
];

describe("visual editors", () => {
	it("covers all twelve elements", () => {
		expect(elements).toHaveLength(12);
	});

	it.each(elements)("%s has an editor and a stub config", (tag) => {
		const element = customElements.get(tag) as unknown as EditableElement;
		expect(
			element.getConfigForm ?? element.getConfigElement,
			"getConfigForm or getConfigElement",
		).toBeTypeOf("function");
		expect(element.getStubConfig, "getStubConfig").toBeTypeOf("function");
	});

	it.each(elements)("%s accepts its stub config", (tag) => {
		const Element = customElements.get(tag) as unknown as EditableElement &
			(new () => HTMLElement & { setConfig(config: LovelaceCardConfig): void });
		const stub = Element.getStubConfig?.(hass) ?? {};
		expect(() =>
			new Element().setConfig({ type: `custom:${tag}`, ...stub }),
		).not.toThrow();
	});
});
