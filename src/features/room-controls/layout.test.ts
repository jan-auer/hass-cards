import { describe, expect, it } from "vitest";
import type { Control } from "./config";
import { arrangeControls } from "./layout";

// An ordered list of entities and spacers; a span of 1, 2 or the rest per item; at most 4 slots (the config
// refuses more).
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
});
