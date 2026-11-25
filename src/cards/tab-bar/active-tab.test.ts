import { describe, expect, it } from "vitest";
import { findActiveTab } from "./active-tab";

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

// The tab bar shows on every page, the active tab comes from the current path, and a subpage may name its parent
// tab.
describe("findActiveTab", () => {
	it("highlights the tab whose view is open, on any dashboard URL", () => {
		expect(findActiveTab(TABS, "/lovelace/wetter")).toBe(2);
		expect(findActiveTab(TABS, "/zuhause/klima/")).toBe(3);
	});

	it("treats the dashboard root as the first tab", () => {
		expect(findActiveTab(TABS, "/lovelace")).toBe(0);
	});

	it("highlights the parent tab on a subpage", () => {
		expect(findActiveTab(TABS, "/lovelace/wohnzimmer", "raeume")).toBe(1);
		expect(
			findActiveTab(TABS, "/lovelace/wohnzimmer", "/lovelace/raeume"),
		).toBe(1);
	});

	it("highlights nothing on a subpage without a parent tab", () => {
		expect(findActiveTab(TABS, "/lovelace/wohnzimmer")).toBe(-1);
	});

	it("matches absolute tab paths as written", () => {
		const tabs = [
			...TABS,
			{ path: "/wartung/akkus", icon: "mdi:battery", label: "Wartung" },
		];
		expect(findActiveTab(tabs, "/wartung/akkus")).toBe(5);
	});
});
