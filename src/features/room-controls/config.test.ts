import { describe, expect, it } from "vitest";
import { configForm, normalizeConfig } from "./config";

describe("normalizeConfig", () => {
	it("accepts entity ids and `spacer` as plain strings", () => {
		const config = normalizeConfig({
			type: "custom:room-controls",
			controls: ["light.a", "spacer", "cover.b"],
		});
		expect(config.controls).toEqual([
			{ kind: "entity", entity: "light.a", span: 1 },
			{ kind: "spacer", span: 1 },
			{ kind: "entity", entity: "cover.b", span: 1 },
		]);
		expect(config.spacer_style).toBe("empty");
	});

	it("keeps per-item icon, span and actions", () => {
		const tap_action = {
			action: "perform-action",
			perform_action: "cover.toggle",
		};
		const config = normalizeConfig({
			type: "custom:room-controls",
			spacer_style: "ghost",
			columns: 3,
			controls: [
				{ entity: "cover.b", icon: "mdi:x", span: 2, tap_action },
				{ type: "spacer", span: "rest" },
			],
		});
		expect(config.controls).toEqual([
			{ kind: "entity", entity: "cover.b", icon: "mdi:x", span: 2, tap_action },
			{ kind: "spacer", span: "rest" },
		]);
		expect(config.spacer_style).toBe("ghost");
		expect(config.columns).toBe(3);
	});

	it("rejects what it can't render, so HA shows its error card", () => {
		const bad = (config: Record<string, unknown>) => () =>
			normalizeConfig({ type: "custom:room-controls", ...config });
		expect(bad({ controls: "light.a" })).toThrow(/Liste/);
		expect(bad({ controls: [{ icon: "mdi:x" }] })).toThrow(/1/);
		expect(
			bad({ controls: ["light.a", { entity: "light.b", span: 3 }] }),
		).toThrow(/2.*span/);
		expect(bad({ controls: [], spacer_style: "left" })).toThrow(/spacer_style/);
		expect(bad({ controls: [], columns: 5 })).toThrow(/columns/);
		// No "…" menu: a row holds at most 4 slots, or its `columns`.
		expect(
			bad({
				controls: ["light.a", "light.b", "light.c", "light.d", "light.e"],
			}),
		).toThrow(/Plätze/);
		expect(
			bad({
				controls: ["light.a", { entity: "light.b", span: 2 }],
				columns: 2,
			}),
		).toThrow(/Plätze/);
		expect(() =>
			normalizeConfig({
				type: "custom:room-controls",
				controls: [
					{ entity: "light.a", span: "rest" },
					"light.b",
					"light.c",
					"light.d",
				],
			}),
		).not.toThrow();
	});

	it("treats a missing list as an empty row", () => {
		expect(normalizeConfig({ type: "custom:room-controls" }).controls).toEqual(
			[],
		);
	});
});

// The visual editor: HA's form editor with a sortable list (object selector).
describe("configForm", () => {
	it("edits the list of buttons and spacers, and the row settings", () => {
		const names = configForm.schema.map((field) => field.name);
		expect(names).toEqual(["controls", "spacer_style", "columns"]);
		const controls = configForm.schema[0] as {
			selector: {
				object: { multiple: boolean; fields: Record<string, unknown> };
			};
		};
		expect(controls.selector.object).toMatchObject({
			multiple: true,
			label_field: "entity",
		});
		expect(Object.keys(controls.selector.object.fields)).toEqual([
			"type",
			"entity",
			"span",
			"icon",
			"tap_action",
			"hold_action",
		]);
	});

	it("reads what the form writes: `type: entity` and spans as text", () => {
		const config = normalizeConfig({
			type: "custom:room-controls",
			controls: [
				{ type: "entity", entity: "light.a", span: "2" },
				{ type: "spacer", span: "1" },
			],
		});
		expect(config.controls).toEqual([
			{ kind: "entity", entity: "light.a", span: 2 },
			{ kind: "spacer", span: 1 },
		]);
	});

	it("sends the short string form to the YAML editor, which the list can't show", () => {
		expect(() =>
			configForm.assertConfig({
				type: "custom:room-controls",
				controls: ["light.a"],
			}),
		).toThrow(/YAML/);
		expect(() =>
			configForm.assertConfig({
				type: "custom:room-controls",
				controls: [{ entity: "light.a" }, { type: "spacer" }],
			}),
		).not.toThrow();
	});
});
