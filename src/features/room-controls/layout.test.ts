import { describe, expect, it } from "vitest";
import type { Control } from "./config";
import { arrangeControls } from "./layout";

// An ordered list of entities and spacers; a span of 1, 2 or the rest per item; at most 4 slots, anything beyond
// collapses into a "…" menu.
const e = (entity: string, span: Control["span"] = 1): Control => ({
	kind: "entity",
	entity,
	span,
});
const spacer = (span: Control["span"] = 1): Control => ({
	kind: "spacer",
	span,
});
const spans = (result: ReturnType<typeof arrangeControls>) =>
	result.cells.map((cell) => [cell.kind, cell.span]);

describe("arrangeControls", () => {
	it("gives each item one column, as many columns as items", () => {
		const result = arrangeControls([e("a"), e("b"), e("c")]);
		expect(result.columns).toBe(3);
		expect(spans(result)).toEqual([
			["entity", 1],
			["entity", 1],
			["entity", 1],
		]);
		expect(result.overflow).toEqual([]);
	});

	it("keeps a spacer where it is", () => {
		expect(spans(arrangeControls([e("a"), spacer(), e("c")]))).toEqual([
			["entity", 1],
			["spacer", 1],
			["entity", 1],
		]);
	});

	it("lets an item take two slots", () => {
		const result = arrangeControls([e("a"), e("b", 2)]);
		expect(result.columns).toBe(3);
		expect(spans(result)).toEqual([
			["entity", 1],
			["entity", 2],
		]);
	});

	it("lets `rest` fill the row: 4 slots by default, or the row's `columns`", () => {
		const fill = arrangeControls([e("a"), e("b", "rest")]);
		expect(fill.columns).toBe(4);
		expect(spans(fill)).toEqual([
			["entity", 1],
			["entity", 3],
		]);
		const three = arrangeControls([e("a"), e("b", "rest")], 3);
		expect(three.columns).toBe(3);
		expect(spans(three)).toEqual([
			["entity", 1],
			["entity", 2],
		]);
	});

	it("shares the rest among several `rest` items, the first gets the remainder", () => {
		expect(
			spans(arrangeControls([e("a"), e("b", "rest"), e("c", "rest")])),
		).toEqual([
			["entity", 1],
			["entity", 2],
			["entity", 1],
		]);
	});

	it("keeps a fixed column count with fewer items", () => {
		const result = arrangeControls([e("a"), e("b")], 3);
		expect(result.columns).toBe(3);
		expect(spans(result)).toEqual([
			["entity", 1],
			["entity", 1],
		]);
	});

	it("shows 3 items and a … with more than 4 slots; the menu holds the rest", () => {
		const result = arrangeControls([e("a"), e("b"), e("c"), e("d"), e("f")]);
		expect(result.columns).toBe(4);
		expect(spans(result)).toEqual([
			["entity", 1],
			["entity", 1],
			["entity", 1],
			["more", 1],
		]);
		expect(result.overflow.map((c) => c.kind === "entity" && c.entity)).toEqual(
			["d", "f"],
		);
	});

	it("drops spacers from the menu", () => {
		const result = arrangeControls([
			e("a"),
			spacer(),
			e("b"),
			e("c"),
			spacer(),
			e("d"),
		]);
		expect(spans(result).at(-1)).toEqual(["more", 1]);
		expect(result.overflow.map((c) => c.kind === "entity" && c.entity)).toEqual(
			["c", "d"],
		);
	});

	it("keeps order: an item that doesn't fit before the … goes to the menu with everything after it", () => {
		const result = arrangeControls([e("a"), e("b"), e("c", 2), e("d")]);
		expect(spans(result)).toEqual([
			["entity", 1],
			["entity", 1],
			["spacer", 1],
			["more", 1],
		]);
		expect(result.overflow.map((c) => c.kind === "entity" && c.entity)).toEqual(
			["c", "d"],
		);
	});

	it("counts the row's `columns` as the limit", () => {
		const result = arrangeControls([e("a"), e("b"), e("c"), e("d")], 3);
		expect(result.columns).toBe(3);
		expect(spans(result)).toEqual([
			["entity", 1],
			["entity", 1],
			["more", 1],
		]);
	});
});
