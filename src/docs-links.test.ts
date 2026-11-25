/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import README from "../README.md?raw";
import "./index";

// Each card's picker entry links to its README section (HA shows it as the editor's help link).
const anchors = new Set(
	[...README.matchAll(/^#{2,3} (.+)$/gm)].map(([, title]) =>
		title
			.toLowerCase()
			.replace(/[^a-z0-9 -]/g, "")
			.trim()
			.replace(/ /g, "-"),
	),
);

describe("documentationURL", () => {
	it("points every card at an existing README section", () => {
		const cards = window.customCards ?? [];
		expect(cards.length).toBeGreaterThan(0);
		for (const card of cards) {
			const [base, anchor] = (card.documentationURL ?? "").split("#");
			expect(base, card.type).toBe("https://github.com/jan-auer/hass-cards");
			expect(anchors.has(anchor), `${card.type} → #${anchor}`).toBe(true);
		}
	});
});
