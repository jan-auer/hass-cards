import { describe, expect, it } from "vitest";
import {
	activeLevel,
	bandGradient,
	dotPosition,
	type LevelConfig,
	normalizeConfig,
	valueText,
} from "./config";

const UV = normalizeConfig({
	type: "custom:level-card",
	entity: "sensor.uv_index",
	max: 11,
	levels: [
		{ from: 0, word: "niedrig", color: "#34C759" },
		{ from: 3, word: "mäßig", color: "#FFCC00" },
		{ from: 6, word: "hoch", color: "#FF9500" },
		{ from: 8, word: "sehr hoch", color: "#FF3B30" },
		{ from: 11, word: "extrem", color: "#AF52DE" },
	],
});

const AQI: LevelConfig = normalizeConfig({
	type: "custom:level-card",
	entity: "sensor.zuhause_luftqualitatsindex",
	min: 1,
	max: 5,
	suffix: "von 5",
	levels: [
		{ from: 1, color: "#34C759" },
		{ from: 2, color: "#A8D84E" },
		{ from: 3, color: "#FFCC00" },
		{ from: 4, color: "#FF9500" },
		{ from: 5, color: "#FF3B30" },
	],
});

describe("activeLevel", () => {
	it("is the last level whose `from` is at or below the value", () => {
		expect(activeLevel(UV, 0)?.word).toBe("niedrig");
		expect(activeLevel(UV, 2.9)?.word).toBe("niedrig");
		expect(activeLevel(UV, 3)?.word).toBe("mäßig");
		expect(activeLevel(UV, 9)?.word).toBe("sehr hoch");
		expect(activeLevel(UV, 13)?.word).toBe("extrem");
		expect(activeLevel(AQI, 4)?.color).toBe("#FF9500");
	});

	it("falls back to the first level below the scale", () => {
		expect(activeLevel(AQI, 0)?.color).toBe("#34C759");
	});
});

describe("dotPosition", () => {
	it("places the value on min…max, clamped to the band", () => {
		expect(dotPosition(UV, 0)).toBe(0);
		expect(dotPosition(UV, 5.5)).toBe(0.5);
		expect(dotPosition(UV, 14)).toBe(1);
		expect(dotPosition(AQI, 1)).toBe(0);
		expect(dotPosition(AQI, 3)).toBe(0.5);
	});
});

describe("bandGradient", () => {
	it("puts each level's colour at its `from` on min…max", () => {
		expect(bandGradient(AQI)).toBe(
			"linear-gradient(90deg, #34C759 0%, #A8D84E 25%, #FFCC00 50%, #FF9500 75%, #FF3B30 100%)",
		);
	});
});

describe("normalizeConfig", () => {
	it("defaults min to the first level and the labels to min and max", () => {
		expect(AQI.min).toBe(1);
		expect([AQI.start_label, AQI.end_label]).toEqual(["1", "5+"]);
		expect([UV.start_label, UV.end_label]).toEqual(["0", "11+"]);
	});

	it("keeps HA name items (`{type: entity}` …) for hass.formatEntityName", () => {
		const base = {
			type: "custom:level-card",
			entity: "sensor.x",
			max: 5,
			levels: [{ from: 0, color: "red" }],
		};
		expect(normalizeConfig({ ...base, name: { type: "entity" } }).name).toEqual(
			{ type: "entity" },
		);
		expect(
			normalizeConfig({ ...base, name: [{ type: "area" }, { type: "entity" }] })
				.name,
		).toEqual([{ type: "area" }, { type: "entity" }]);
		expect(normalizeConfig({ ...base, name: "UV-Index" }).name).toBe(
			"UV-Index",
		);
		expect(normalizeConfig({ ...base, name: "" }).name).toBeUndefined();
	});

	it("needs an entity, levels and max", () => {
		expect(() =>
			normalizeConfig({ type: "custom:level-card", max: 5, levels: [] }),
		).toThrow();
		expect(() =>
			normalizeConfig({
				type: "custom:level-card",
				entity: "sensor.x",
				levels: [{ from: 0, color: "red" }],
			}),
		).toThrow();
	});
});

describe("valueText", () => {
	it("shows integers as integers, everything else with one decimal", () => {
		expect(valueText(3, "de")).toBe("3");
		expect(valueText(2.46, "de")).toBe("2,5");
	});
});
