import {
	css,
	html,
	LitElement,
	nothing,
	type PropertyValues,
	type TemplateResult,
} from "lit";
import { fireHassAction } from "../../ha/actions";
import { entitiesChanged } from "../../ha/entities";
import { registerCardFeature } from "../../ha/register";
import type {
	ActionConfig,
	HomeAssistant,
	LovelaceCardConfig,
} from "../../ha/types";
import {
	configForm,
	type EntityControl,
	normalizeConfig,
	type RoomControlsConfig,
} from "./config";
import { controlIcon, isOn } from "./icons";
import { arrangeControls, type Cell } from "./layout";
import { activeColorCss } from "./state";

/** HA's hold time for actions (500 ms, as in its action handler). */
const HOLD_MS = 500;

const TOGGLE: ActionConfig = { action: "toggle" };
const MORE_INFO: ActionConfig = { action: "more-info" };

/**
 * A room's buttons, as a card feature (`type: custom:room-controls` in the `features:` of an area card or
 * room-tile-card; other cards get a hint instead). Looks like HA's own feature buttons (`area-controls`),
 * and adds what those can't: any entities and tap action, spacers and wide items, up to 4 slots.
 */
export class RoomControls extends LitElement {
	static override properties = {
		hass: { attribute: false },
		context: { attribute: false },
		position: { attribute: false },
		_config: { state: true },
	};

	declare hass?: HomeAssistant;
	/** What the host card passes; the row needs its area (the buttons name their own entities). */
	declare context?: Record<string, unknown>;
	/** `bottom` or `inline`; the host sets `--feature-height` for each. */
	declare position?: "bottom" | "inline";
	declare _config?: RoomControlsConfig;

	private _watched: string[] = [];
	private _holdTimer?: ReturnType<typeof setTimeout>;
	private _held = false;

	static getConfigForm() {
		return configForm;
	}

	static getStubConfig(): LovelaceCardConfig {
		return { type: "custom:room-controls", controls: [] };
	}

	setConfig(config: LovelaceCardConfig): void {
		this._config = normalizeConfig(config);
		this._watched = this._config.controls.flatMap((control) =>
			control.kind === "entity" ? [control.entity] : [],
		);
	}

	/** `hass` changes on every state change in the house; only this row's entities matter. */
	protected override shouldUpdate(changed: PropertyValues<this>): boolean {
		if (changed.size === 1 && changed.has("hass")) {
			return entitiesChanged(
				changed.get("hass") as HomeAssistant | undefined,
				this.hass,
				this._watched,
			);
		}
		return true;
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this._cancelHold();
	}

	private _run(action: ActionConfig, control: EntityControl): void {
		this.dispatchEvent(
			new CustomEvent("haptic", {
				detail: "light",
				bubbles: true,
				composed: true,
			}),
		);
		fireHassAction(this, action, control.entity);
	}

	private _pointerDown(control: EntityControl): void {
		this._cancelHold();
		this._held = false;
		this._holdTimer = setTimeout(() => {
			this._held = true;
			this._run(control.hold_action ?? MORE_INFO, control);
		}, HOLD_MS);
	}

	private _cancelHold(): void {
		if (this._holdTimer) clearTimeout(this._holdTimer);
		this._holdTimer = undefined;
	}

	private _click(event: Event, control: EntityControl): void {
		event.stopPropagation();
		this._cancelHold();
		if (this._held) {
			this._held = false;
			return;
		}
		const action = control.tap_action ?? TOGGLE;
		// A tap set to `{action: none}` does nothing at all, not even a haptic.
		if (action.action === "none") return;
		this._run(action, control);
	}

	override render() {
		const config = this._config;
		if (!config) return nothing;
		if (!hasArea(this.context))
			return html`<div class="hint">Nur auf Raum-Karten</div>`;
		const { columns, cells } = arrangeControls(config.controls, config.columns);
		return html`<div class="row" style="--_columns: ${columns}">${cells.map((cell) => this._cell(cell))}</div>`;
	}

	private _cell(cell: Cell): TemplateResult {
		const span = `grid-column: span ${cell.span}`;
		switch (cell.kind) {
			case "spacer":
				return html`<span class="spacer ${this._config?.spacer_style}" style=${span} aria-hidden="true"></span>`;
			case "entity":
				return this._button(cell.control, span);
		}
	}

	private _button(control: EntityControl, span: string): TemplateResult {
		const entity = this.hass?.states[control.entity];
		if (!entity) {
			return html`<button type="button" class="control" style=${span} data-entity=${control.entity} title=${control.entity} disabled><ha-icon icon="mdi:help-circle-outline"></ha-icon></button>`;
		}
		const on = isOn(entity);
		const unavailable = entity.state === "unavailable";
		// The theme's state colour through HA's cascade, like HA's own feature buttons (decision #48).
		const color = on ? `; --_state: ${activeColorCss(entity)}` : "";
		const name = String(entity.attributes.friendly_name ?? control.entity);
		return html`<button
			type="button"
			class=${["control", on && "on", unavailable && "unavailable"].filter(Boolean).join(" ")}
			style=${span + color}
			data-entity=${control.entity}
			aria-label=${name}
			title=${name}
			aria-pressed=${on ? "true" : "false"}
			@pointerdown=${() => this._pointerDown(control)}
			@pointerup=${this._cancelHold}
			@pointercancel=${this._cancelHold}
			@pointerleave=${this._cancelHold}
			@contextmenu=${(event: Event) => event.preventDefault()}
			@click=${(event: Event) => this._click(event, control)}
		><ha-icon icon=${controlIcon(entity, control.icon, on)}></ha-icon></button>`;
	}

	/*
	 * HA's feature buttons (ha-control-button in area-controls, frontend 20261028.6): the host card's
	 * --feature-height (42 below, 36 inline), --feature-border-radius and --feature-button-spacing; a
	 * --disabled-color wash at 20 % when off, the state colour as wash and icon when on; 20 px icons.
	 */
	static override styles = css`
		:host {
			display: block;
			--_height: var(--feature-height, 42px);
			--_radius: var(--feature-border-radius, var(--ha-border-radius-lg, 16px));
			--_gap: var(--feature-button-spacing, 12px);
			/* Only the buttons catch taps; spacers and gaps let them through to the card below, whose own
			   action and ripple then fire (HA's tile: the action surface lies under content and features,
			   which are pointer-events: none). Important, because HA's feature wrapper sets
			   pointer-events: auto on this element from outside, and only an important :host rule beats it. */
			pointer-events: none !important;
		}
		button {
			pointer-events: auto;
		}
		.row {
			display: grid;
			grid-template-columns: repeat(var(--_columns), minmax(0, 1fr));
			gap: var(--_gap);
		}
		.control {
			position: relative;
			z-index: 0;
			overflow: hidden;
			display: flex;
			align-items: center;
			justify-content: center;
			color: var(--primary-text-color);
			--mdc-icon-size: 20px;
			transition: color 180ms ease-in-out;
		}
		.control {
			appearance: none;
			box-sizing: border-box;
			min-width: 0;
			height: var(--_height);
			margin: 0;
			padding: 0;
			border: none;
			border-radius: var(--_radius);
			background: none;
			font: inherit;
			cursor: pointer;
			outline: none;
			-webkit-tap-highlight-color: transparent;
			-webkit-touch-callout: none;
			user-select: none;
			-webkit-user-select: none;
		}
		.control::before,
		.spacer.ghost::before {
			content: "";
			position: absolute;
			inset: 0;
			z-index: -1;
			background-color: var(--disabled-color);
			opacity: 0.2;
			transition:
				background-color 180ms ease-in-out,
				opacity 180ms ease-in-out;
		}
		.control.on {
			color: var(--_state);
		}
		.control.on::before {
			background-color: var(--_state);
		}
		.control:active::before {
			opacity: 0.3;
		}
		.control:focus-visible {
			box-shadow: 0 0 0 2px var(--feature-color, var(--secondary-text-color));
		}
		.control:disabled,
		.control.unavailable {
			cursor: default;
			color: var(--disabled-text-color);
		}
		.control ha-icon {
			pointer-events: none;
		}
		.spacer {
			position: relative;
			z-index: 0;
			overflow: hidden;
			height: var(--_height);
			border-radius: var(--_radius);
		}
		.spacer.ghost::before {
			opacity: 0.08;
		}

		.hint {
			padding: 0 4px;
			color: var(--secondary-text-color);
			font-size: var(--ha-font-size-s, 12px);
		}
	`;
}

function hasArea(context?: Record<string, unknown>): boolean {
	return typeof context?.area_id === "string" && context.area_id !== "";
}

registerCardFeature("room-controls", RoomControls, {
	name: "Raum-Schalter",
	// A room's buttons: offered only on cards about an area (the area card, room-tile-card).
	isSupported: (_hass, context) => hasArea(context),
	configurable: true,
});
