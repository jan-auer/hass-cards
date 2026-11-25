import { afterEach, describe, expect, it } from "vitest";
import { filterStore } from "./store";

// The selection lives only in memory and starts at the bar's default on every visit to the page (tab bar, back);
// opening or closing a sheet (`#hash`) keeps it. Tapping the selected filter again goes back to the default.

const navigate = (url: string) => {
	history.pushState(null, "", url);
	window.dispatchEvent(new Event("location-changed"));
};

afterEach(() => navigate("/test-reset"));

describe("filterStore", () => {
	it("clears a selection back to the default", () => {
		filterStore.setDefault("raeume", "alle");
		filterStore.select("raeume", "eg");
		filterStore.clear("raeume");
		expect(filterStore.value("raeume")).toBe("alle");
		expect(filterStore.isSelected("raeume")).toBe(false);
	});

	it("starts at the bar's default and follows a selection, per group", () => {
		filterStore.setDefault("raeume", "alle");
		filterStore.setDefault("licht", "an");
		expect(filterStore.value("raeume")).toBe("alle");
		filterStore.select("raeume", "eg");
		expect(filterStore.value("raeume")).toBe("eg");
		expect(filterStore.value("licht")).toBe("an");
	});

	it("tells subscribers of their group when the value changes", () => {
		const seen: string[] = [];
		const unsubscribe = filterStore.subscribe("raeume", () =>
			seen.push(String(filterStore.value("raeume"))),
		);
		filterStore.select("raeume", "kg");
		filterStore.select("licht", "eg");
		unsubscribe();
		filterStore.select("raeume", "dg");
		expect(seen).toEqual(["kg"]);
	});

	it("resets to the default when the page changes, also via back", () => {
		navigate("/lovelace/raeume");
		filterStore.setDefault("raeume", "alle");
		filterStore.select("raeume", "eg");
		navigate("/lovelace/home");
		expect(filterStore.value("raeume")).toBe("alle");

		navigate("/lovelace/raeume");
		filterStore.select("raeume", "kg");
		history.pushState(null, "", "/lovelace/buro");
		window.dispatchEvent(new PopStateEvent("popstate"));
		expect(filterStore.value("raeume")).toBe("alle");
	});

	it("keeps the selection when only the hash or the query changes (sheets, edit mode)", () => {
		navigate("/lovelace/raeume");
		filterStore.setDefault("raeume", "alle");
		filterStore.select("raeume", "eg");
		navigate("/lovelace/raeume#media-buro");
		window.dispatchEvent(new PopStateEvent("popstate"));
		navigate("/lovelace/raeume?edit=1");
		expect(filterStore.value("raeume")).toBe("eg");
	});
});
