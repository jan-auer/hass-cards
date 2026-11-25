import { describe, expect, it } from "vitest";
import { normalizeConfig, roomColor } from "./config";
import { highlightStyle } from "./highlight";

// The neutral highlight: in dark mode a soft white glow with little tint, in light mode a lifted white card.
describe("highlightStyle", () => {
	it("glows softly white in dark mode, with at most a faint wash", () => {
		const style = highlightStyle("neutral", "dark", "#000");
		expect(style.shadow).toMatch(/0 0 \d+px rgba\(255, 255, 255, 0\.\d+\)/);
		expect(style.background ?? "").not.toMatch(/0\.[1-9]/);
	});

	it("lights the dark card from above, like the theme's own top edge, with a fainter bottom edge over a faint even ring", () => {
		const { shadow } = highlightStyle("neutral", "dark", "0, 0, 0");
		expect(shadow).toContain("inset 0 1px 0 0 rgba(255, 255, 255, 0.1)");
		expect(shadow).toContain("inset 0 -1px 0 0 rgba(255, 255, 255, 0.025)");
		expect(shadow).toContain("inset 0 0 0 1px rgba(255, 255, 255, 0.06)");
		expect(shadow).toContain("0 0 10px rgba(255, 255, 255, 0.06)");
	});

	it("lifts a white card in light mode", () => {
		expect(highlightStyle("neutral", "light", "#000").background).toContain(
			"#fff",
		);
	});

	it("rejects the old trial names", () => {
		for (const highlight of ["neutral-a", "neutral-b", "neutral-c"]) {
			expect(() =>
				normalizeConfig({
					type: "custom:room-tile-card",
					area: "buro",
					highlight,
				}),
			).toThrow(/highlight/);
		}
	});

	it("keeps the room and warm tints", () => {
		expect(highlightStyle("room", "light", "#983e4a").background).toContain(
			"color-mix(in srgb, #983e4a 16%, transparent)",
		);
		expect(highlightStyle("warm", "dark", "#000").shadow).toContain(
			"color-mix(in srgb, #ff9f0a 40%, transparent)",
		);
	});

	it("tints in a theme colour, as HA's colour picker writes it", () => {
		const config = normalizeConfig({
			type: "custom:room-tile-card",
			area: "buro",
			color: "teal",
		});
		expect(roomColor(config.color)).toBe("var(--teal-color)");
		expect(
			highlightStyle("room", "dark", roomColor(config.color)).shadow,
		).toContain("color-mix(in srgb, var(--teal-color) 50%, transparent)");
		expect(roomColor("#983E4A")).toBe("#983E4A");
	});
});
