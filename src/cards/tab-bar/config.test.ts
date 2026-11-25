import { describe, expect, it } from "vitest";
import { normalizeConfig } from "./config";
import { FloatingTabBar } from "./tab-bar";

// No built-in tabs; every tab bar lists its own (the dashboard's view paths belong in its config).
describe("normalizeConfig", () => {
	it("requires tabs", () => {
		expect(() => normalizeConfig({ type: "custom:floating-tab-bar" })).toThrow(
			/tabs/,
		);
		expect(() =>
			normalizeConfig({ type: "custom:floating-tab-bar", tabs: [] }),
		).toThrow(/tabs/);
	});

	it("accepts the card picker's stub config", () => {
		const stub = FloatingTabBar.getStubConfig();
		expect(
			normalizeConfig({ type: "custom:floating-tab-bar", ...stub }).tabs.length,
		).toBeGreaterThan(0);
	});
});
