import { afterEach, describe, expect, it } from "vitest";
import type {
	HassEntity,
	HomeAssistant,
	LovelaceCardConfig,
} from "../../ha/types";
import "./vacuum-tile";
import type { VacuumTileCard } from "./vacuum-tile";

/** Stand-in for HA's feature row element (hui-card-features): records what it gets. */
class FakeFeatureRow extends HTMLElement {
	features?: unknown[];
	connectedCallback() {
		this.innerHTML = "<button>Pause</button>";
	}
}
if (!customElements.get("hui-card-features"))
	customElements.define("hui-card-features", FakeFeatureRow);

function entity(
	entity_id: string,
	state: string,
	attributes: Record<string, unknown> = {},
): HassEntity {
	return { entity_id, state, attributes, last_changed: "", last_updated: "" };
}

function mockHass(
	state: string,
	templates: Record<string, string> = {},
): HomeAssistant {
	// formatEntityName isn't in the shared HomeAssistant type yet; the card reads it defensively.
	const hass = {
		states: {
			"vacuum.saros": entity("vacuum.saros", state, {
				friendly_name: "Saros 10R",
			}),
			"sensor.saros_batterie": entity("sensor.saros_batterie", "45"),
			"binary_sensor.saros_ladestatus": entity(
				"binary_sensor.saros_ladestatus",
				"on",
			),
		},
		// Distinct from friendly_name, so the tests see that HA's formatting is used.
		formatEntityName: (_e: HassEntity, name?: string) =>
			name ?? "Saros 10R (HA)",
		formatEntityState: (e: HassEntity) =>
			({ docked: "Angedockt", cleaning: "Reinigt" })[e.state] ?? e.state,
		connection: {
			subscribeMessage: async <T>(
				callback: (message: T) => void,
				message: Record<string, unknown>,
			) => {
				const result = templates[String(message.template)];
				if (result !== undefined)
					queueMicrotask(() => callback({ result } as T));
				return async () => {};
			},
		},
	};
	return hass;
}

const CONFIG: LovelaceCardConfig = {
	type: "custom:vacuum-tile-card",
	entity: "vacuum.saros",
	name: "Saros",
	icon: "phu:roborock",
	battery_entity: "sensor.saros_batterie",
	charging_entity: "binary_sensor.saros_ladestatus",
	state_detail: "DETAIL",
	lines: "LINES",
	features: [{ type: "custom:service-call" }],
	tap_action: { action: "navigate", navigation_path: "#saros" },
	icon_tap_action: { action: "none" },
};

async function mount(
	state: string,
	config: LovelaceCardConfig = CONFIG,
): Promise<{ card: VacuumTileCard; actions: unknown[] }> {
	const card = document.createElement("vacuum-tile-card") as VacuumTileCard;
	card.setConfig(config);
	card.hass = mockHass(state, {
		// The real template renders the room only while cleaning or paused.
		DETAIL: state === "cleaning" ? "Küche" : "",
		LINES: "Zuletzt **Sa 11:20**\n21 m² · 19 min",
		ACTIVE: "True",
	});
	const actions: unknown[] = [];
	card.addEventListener("hass-action", (event) =>
		actions.push((event as CustomEvent).detail),
	);
	document.body.append(card);
	await new Promise((resolve) => setTimeout(resolve, 20));
	await card.updateComplete;
	return { card, actions };
}

const shadow = (card: VacuumTileCard) => card.shadowRoot as ShadowRoot;

afterEach(() => {
	document.body.innerHTML = "";
});

describe("vacuum-tile-card", () => {
	it("docked: name, translated state, battery beside the icon; the lines in the bottom slot", async () => {
		const { card } = await mount("docked");
		const root = shadow(card);
		expect(root.querySelector(".name")?.textContent).toContain("Saros");
		expect(root.querySelector(".state")?.textContent?.trim()).toBe("Angedockt");
		expect(root.querySelector(".battery ha-icon")?.getAttribute("icon")).toBe(
			"mdi:battery-charging-50",
		);
		expect(root.querySelector(".battery")?.textContent).toContain("45 %");
		expect(root.querySelector(".lines")?.textContent).toContain(
			"21 m² · 19 min",
		);
		expect(root.querySelector(".lines b")?.textContent).toBe("Sa 11:20");
		expect(root.querySelector("hui-card-features")).toBeNull();
	});

	it("without name: the entity's name as HA formats it (hass.formatEntityName, like the stock tile)", async () => {
		const { name: _name, ...unnamed } = CONFIG;
		const { card } = await mount("docked", unnamed);
		expect(shadow(card).querySelector(".name .text")?.textContent?.trim()).toBe(
			"Saros 10R (HA)",
		);
	});

	it("without icon_tap_action: the icon has no action and no backdrop (HA's default for vacuums)", async () => {
		const { icon_tap_action: _icon, ...defaults } = CONFIG;
		const { card, actions } = await mount("docked", defaults);
		const icon = shadow(card).querySelector(".icon") as HTMLElement;
		expect(icon.classList.contains("tappable")).toBe(false);
		icon.click();
		expect(actions).toEqual([
			{
				config: { entity: "vacuum.saros", tap_action: CONFIG.tap_action },
				action: "tap",
			},
		]);
	});

	it("cleaning: the state detail follows the state and the features replace the lines", async () => {
		const { card } = await mount("cleaning");
		const root = shadow(card);
		expect(root.querySelector(".state")?.textContent?.trim()).toBe(
			"Reinigt · Küche",
		);
		expect(root.querySelector("hui-card-features")).not.toBeNull();
		expect(root.querySelector(".lines")).toBeNull();
	});

	it("active template: overrides the state (docked mid-program shows the features)", async () => {
		const { card } = await mount("docked", { ...CONFIG, active: "ACTIVE" });
		const root = shadow(card);
		expect(root.querySelector("hui-card-features")).not.toBeNull();
		expect(root.querySelector(".lines")).toBeNull();
	});

	it("a tap on the lines runs the card's tap action", async () => {
		const { card, actions } = await mount("docked");
		(shadow(card).querySelector(".lines") as HTMLElement).click();
		expect(actions).toEqual([
			{
				config: { entity: "vacuum.saros", tap_action: CONFIG.tap_action },
				action: "tap",
			},
		]);
	});

	it("icon_tap_action none: the icon isn't interactive (no backdrop, as HA's tile icon) and a tap is the card's", async () => {
		const { card, actions } = await mount("docked");
		const icon = shadow(card).querySelector(".icon") as HTMLElement;
		expect(icon.getAttribute("role")).toBeNull();
		expect(getComputedStyle(icon, "::before").content).toBe("none");
		icon.click();
		expect(actions).toEqual([
			{
				config: { entity: "vacuum.saros", tap_action: CONFIG.tap_action },
				action: "tap",
			},
		]);
	});

	it("a long press on the card runs hold_action instead of the tap", async () => {
		const { card, actions } = await mount("docked");
		const lines = shadow(card).querySelector(".lines") as HTMLElement;
		lines.dispatchEvent(
			new PointerEvent("pointerdown", { bubbles: true, composed: true }),
		);
		await new Promise((resolve) => setTimeout(resolve, 600));
		lines.dispatchEvent(
			new PointerEvent("pointerup", { bubbles: true, composed: true }),
		);
		lines.click();
		expect(actions).toEqual([
			{
				config: { entity: "vacuum.saros", tap_action: { action: "more-info" } },
				action: "tap",
			},
		]);
	});

	it("a tap on a feature button is the feature's, not the card's", async () => {
		const { card, actions } = await mount("cleaning");
		(
			shadow(card).querySelector("hui-card-features button") as HTMLElement
		).click();
		expect(actions).toEqual([]);
	});
});
