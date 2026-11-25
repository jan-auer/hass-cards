import { afterEach, describe, expect, it, vi } from "vitest";
import type { HassEntity, HomeAssistant } from "../../ha/types";
import "./room-controls";
import type { RoomControls } from "./room-controls";

function entity(
	entity_id: string,
	state: string,
	attributes: Record<string, unknown> = {},
): HassEntity {
	return {
		entity_id,
		state,
		attributes,
		last_changed: "2026-11-21T10:00:00Z",
		last_updated: "2026-11-21T10:00:00Z",
	};
}

function mockHass(overrides: Record<string, HassEntity> = {}): HomeAssistant {
	return {
		states: {
			"light.room": entity("light.room", "on", { friendly_name: "Licht" }),
			"cover.room": entity("cover.room", "closed", { friendly_name: "Rollo" }),
			"media_player.room": entity("media_player.room", "paused"),
			"switch.a": entity("switch.a", "off", { friendly_name: "Steckdose" }),
			"switch.b": entity("switch.b", "on", { friendly_name: "Lüfter" }),
			"sensor.elsewhere": entity("sensor.elsewhere", "1"),
			...overrides,
		},
	};
}

let row: RoomControls;

async function mount(
	config: Record<string, unknown>,
	hass = mockHass(),
	position: "bottom" | "inline" = "bottom",
	context: Record<string, unknown> = { area_id: "living_room" },
): Promise<RoomControls> {
	row = document.createElement("room-controls") as RoomControls;
	row.setConfig({ type: "custom:room-controls", ...config });
	row.hass = hass;
	row.context = context;
	row.position = position;
	row.style.width = "300px";
	document.body.append(row);
	await row.updateComplete;
	return row;
}

const $$ = (selector: string) => [
	...(row.shadowRoot?.querySelectorAll<HTMLElement>(selector) ?? []),
];
const button = (entityId: string) =>
	row.shadowRoot?.querySelector<HTMLElement>(
		`button[data-entity="${entityId}"]`,
	) as HTMLElement;

function captureActions() {
	const actions: Array<Record<string, unknown>> = [];
	document.body.addEventListener("hass-action", (event) =>
		actions.push((event as CustomEvent).detail.config),
	);
	return actions;
}

afterEach(() => {
	row?.remove();
	vi.useRealTimers();
});

describe("room-controls", () => {
	it("lets taps outside its buttons through to the card below (spacers, gaps), like HA's own feature rows", async () => {
		// A tap on a spacer must land on the card itself (its action and ripple).
		// HA's feature wrapper sets pointer-events: auto on the feature element from outside
		const outer = document.createElement("style");
		outer.textContent = "room-controls { pointer-events: auto; }";
		document.head.append(outer);
		await mount({ controls: ["spacer", "light.room"] });
		const pointerEvents = (element: Element) =>
			getComputedStyle(element).pointerEvents;
		expect(pointerEvents(row)).toBe("none");
		expect(pointerEvents($$(".spacer")[0])).toBe("none");
		expect(pointerEvents(button("light.room"))).toBe("auto");
		outer.remove();
	});

	it("renders a button per entity and a slot per spacer, in order, filling the row", async () => {
		await mount({
			controls: ["light.room", "spacer", "media_player.room"],
			spacer_style: "ghost",
		});
		const cells = $$(".row > *");
		expect(cells.map((cell) => cell.className)).toEqual([
			"control on",
			"spacer ghost",
			"control",
		]);
		const widths = cells.map((cell) => cell.getBoundingClientRect().width);
		expect(widths[0]).toBeCloseTo(widths[2], 0);
		expect(widths[0]).toBeCloseTo((300 - 2 * 12) / 3, 0);
	});

	it("colours an active button through HA's state-colour cascade and shows the state icon", async () => {
		await mount({ controls: ["light.room", "cover.room"] });
		expect(button("light.room").getAttribute("style")).toContain(
			"--state-light-active-color",
		);
		expect(
			button("light.room").querySelector("ha-icon")?.getAttribute("icon"),
		).toBe("mdi:lightbulb");
		expect(button("cover.room").getAttribute("style") ?? "").not.toContain(
			"--state",
		);
		expect(
			button("cover.room").querySelector("ha-icon")?.getAttribute("icon"),
		).toBe("mdi:window-shutter");
	});

	it("toggles on tap by default and runs a configured tap_action", async () => {
		const actions = captureActions();
		const smartLights = {
			action: "perform-action",
			perform_action: "script.control_smart_lights",
			data: { action: "toggle", entity_id: "input_text.wohnzimmer_licht" },
		};
		await mount({
			controls: [
				{ entity: "light.room", tap_action: smartLights },
				"cover.room",
			],
		});
		button("light.room").click();
		button("cover.room").click();
		expect(actions).toEqual([
			{ entity: "light.room", tap_action: smartLights },
			{ entity: "cover.room", tap_action: { action: "toggle" } },
		]);
	});

	it("opens more-info on hold, without the tap", async () => {
		const actions = captureActions();
		await mount({ controls: ["cover.room"] });
		const target = button("cover.room");
		target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
		await new Promise((resolve) => setTimeout(resolve, 600));
		target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
		target.click();
		expect(actions).toEqual([
			{ entity: "cover.room", tap_action: { action: "more-info" } },
		]);
	});

	it("shows only a hint on a card without an area", async () => {
		await mount({ controls: ["light.room"] }, mockHass(), "bottom", {
			entity_id: "light.room",
		});
		expect($$("button").length).toBe(0);
		expect(row.shadowRoot?.textContent).toContain("Raum");
	});

	it("ignores state changes of other entities", async () => {
		const hass = mockHass();
		await mount({ controls: ["light.room"] }, hass);
		const render = vi.spyOn(row, "render" as never);
		row.hass = {
			...hass,
			states: {
				...hass.states,
				"sensor.elsewhere": entity("sensor.elsewhere", "2"),
			},
		};
		await row.updateComplete;
		expect(render).not.toHaveBeenCalled();
		row.hass = {
			...hass,
			states: { ...hass.states, "light.room": entity("light.room", "off") },
		};
		await row.updateComplete;
		expect(render).toHaveBeenCalled();
	});

	it("follows the stock feature height in both positions", async () => {
		await mount({ controls: ["light.room"] });
		row.style.setProperty("--feature-height", "36px");
		await row.updateComplete;
		expect(button("light.room").getBoundingClientRect().height).toBe(36);
	});

	// The state colour and the tap come from the entity alone; there are no per-item overrides.
	it("colours from the entity's state and taps with tap_action only", async () => {
		const actions = captureActions();
		const reset = { action: "perform-action", perform_action: "script.x" };
		await mount({
			controls: [
				{
					entity: "light.room",
					tap_action: reset,
					active_color: "blue",
					active_tap_action: { action: "none" },
				},
			],
		});
		expect(button("light.room").getAttribute("style")).not.toContain(
			"--blue-color",
		);
		button("light.room").click();
		expect(actions).toEqual([{ entity: "light.room", tap_action: reset }]);
	});
});
