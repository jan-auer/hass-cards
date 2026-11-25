import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HomeAssistant } from "../../ha/types";
import "./tab-bar";
import type { FloatingTabBar } from "./tab-bar";

// An example dashboard's tab bar.
const TABS = [
	{
		path: "home",
		icon: "mdi:home-outline",
		active_icon: "mdi:home",
		label: "Home",
	},
	{
		path: "raeume",
		icon: "mdi:door",
		active_icon: "mdi:door-open",
		label: "Räume",
	},
	{ path: "wetter", icon: "mdi:weather-partly-cloudy", label: "Wetter" },
	{ path: "klima", icon: "mdi:weather-windy", label: "Klima" },
	{ path: "haus", icon: "mdi:tune-variant", label: "Haus" },
];

function mockHass(lightState: string): HomeAssistant {
	return {
		states: {
			"light.wohnzimmer": {
				entity_id: "light.wohnzimmer",
				state: lightState,
				attributes: {},
				last_changed: "2026-11-21T10:00:00Z",
				last_updated: "2026-11-21T10:00:00Z",
			},
		},
	};
}

function navigateTo(path: string): void {
	history.pushState(null, "", path);
	window.dispatchEvent(new CustomEvent("location-changed"));
}

function activeTab(card: FloatingTabBar): HTMLElement | null | undefined {
	return card.shadowRoot?.querySelector<HTMLElement>("[aria-current='page']");
}

function tabNamed(card: FloatingTabBar, label: string): HTMLElement {
	const tab = card.shadowRoot?.querySelector<HTMLElement>(
		`button[aria-label='${label}']`,
	);
	if (!tab) throw new Error(`No tab labelled ${label}`);
	return tab;
}

async function mountCard(
	config: Record<string, unknown> = {},
): Promise<FloatingTabBar> {
	const card = document.createElement("floating-tab-bar") as FloatingTabBar;
	card.setConfig({ type: "custom:floating-tab-bar", tabs: TABS, ...config });
	card.hass = mockHass("off");
	document.body.append(card);
	await card.updateComplete;
	return card;
}

describe("floating-tab-bar", () => {
	let card: FloatingTabBar;
	const startPath = location.pathname;

	beforeEach(() => history.replaceState(null, "", "/lovelace/raeume"));
	afterEach(() => {
		card?.remove();
		history.replaceState(null, "", startPath);
	});

	it("marks the tab of the current view as active, with its active icon", async () => {
		card = await mountCard();
		expect(activeTab(card)?.getAttribute("aria-label")).toBe("Räume");
		expect(
			activeTab(card)?.querySelector("ha-icon")?.getAttribute("icon"),
		).toBe("mdi:door-open");
		expect(
			card.shadowRoot?.querySelectorAll("[aria-current='page']"),
		).toHaveLength(1);
	});

	it("follows navigation and highlights the parent tab on a subpage", async () => {
		card = await mountCard({ parent_tab: "raeume" });
		navigateTo("/lovelace/klima");
		await card.updateComplete;
		expect(activeTab(card)?.getAttribute("aria-label")).toBe("Klima");

		navigateTo("/lovelace/wohnzimmer");
		await card.updateComplete;
		expect(activeTab(card)?.getAttribute("aria-label")).toBe("Räume");
	});

	it("navigates through HA's hass-action event when a tab is tapped", async () => {
		card = await mountCard();
		const actions: CustomEvent[] = [];
		const listener = (event: Event) => actions.push(event as CustomEvent);
		document.addEventListener("hass-action", listener);

		tabNamed(card, "Wetter").click();
		tabNamed(card, "Räume").click(); // already there: no navigation

		document.removeEventListener("hass-action", listener);
		expect(actions).toHaveLength(1);
		expect(actions[0].detail).toEqual({
			action: "tap",
			config: {
				tap_action: {
					action: "navigate",
					navigation_path: "/lovelace/wetter",
				},
			},
		});
	});

	it("does not re-render when unrelated state changes", async () => {
		card = await mountCard();
		const render = vi.spyOn(card, "render" as keyof FloatingTabBar & "render");

		card.hass = mockHass("on");
		await card.updateComplete;
		expect(render).not.toHaveBeenCalled();

		// Dark mode (the bar has its own glass values) follows HA's theme without a re-render.
		card.hass = { ...mockHass("on"), themes: { darkMode: true } };
		await card.updateComplete;
		expect(card.hasAttribute("dark")).toBe(true);
		expect(render).not.toHaveBeenCalled();

		card.setConfig({
			type: "custom:floating-tab-bar",
			tabs: TABS,
			parent_tab: "haus",
		});
		await card.updateComplete;
		expect(render).toHaveBeenCalled();
	});
});
