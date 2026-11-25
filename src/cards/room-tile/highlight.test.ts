import { describe, expect, it } from "vitest";
import { normalizeConfig } from "./config";
import { highlightStyle } from "./highlight";

// The neutral highlight: in dark mode a soft white glow with little tint, in light mode a lifted white card.
describe("highlightStyle", () => {
	it("glows softly white in dark mode, with at most a faint wash", () => {
		const style = highlightStyle("neutral", "dark", "0, 0, 0");
		expect(style.shadow).toMatch(/0 0 \d+px rgba\(255, 255, 255, 0\.\d+\)/);
		expect(style.background ?? "").not.toMatch(/0\.[1-9]/);
	});

	it("lifts a white card in light mode", () => {
		expect(highlightStyle("neutral", "light", "0, 0, 0").background).toContain(
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
		expect(highlightStyle("room", "light", "152, 62, 74").background).toContain(
			"rgba(152, 62, 74, 0.16)",
		);
		expect(highlightStyle("warm", "dark", "0, 0, 0").shadow).toContain(
			"rgba(255, 159, 10, 0.4)",
		);
	});
});
