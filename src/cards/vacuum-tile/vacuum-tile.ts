import { css, html, LitElement, nothing } from "lit";
import { fireHassAction } from "../../ha/actions";
import { entitiesChanged } from "../../ha/entities";
import {
	FEATURE_ROW,
	fromFeatureRow,
	loadFeatureRow,
} from "../../ha/feature-row";
import { registerCard } from "../../ha/register";
import { stateActive, stateColorCss } from "../../ha/state-color";
import { TemplateSubscriptions } from "../../ha/templates";
import type {
	ActionConfig,
	HassEntity,
	HomeAssistant,
	LovelaceCardConfig,
	LovelaceCardElement,
} from "../../ha/types";
import { batteryColor, batteryIcon } from "./battery";
import {
	normalizeConfig,
	splitLines,
	truthy,
	type VacuumTileConfig,
} from "./config";
import { configForm } from "./form";

type TemplateKey = "state_detail" | "lines" | "warning" | "active";

/** Long press, as HA's action handler counts it. */
const HOLD_MS = 500;

/**
 * A tile for a robot vacuum: icon, name and HA's translated state with a
 * detail (room, error text) and the battery glyph on the name row; below, in the stock 42 px feature slot,
 * either text lines (docked) or stock card features (while active). Geometry of HA's tile with one
 * feature row, measured with HA's default theme at 375 px: 66 px top row, 36 px icon at 10 px, text from 56 px, feature slot
 * 42 px with 12 px insets.
 *
 * Taps: the card runs `tap_action` (long press: `hold_action`), the icon `icon_tap_action` (with `none` the icon is
 * not interactive, as HA's tile icon, and its taps are the card's); the lines let taps through to the card; feature
 * buttons keep their own.
 */
export class VacuumTileCard extends LitElement {
	static override properties = {
		_config: { state: true },
		_results: { state: true },
		_featureRow: { state: true },
	};

	declare _config?: VacuumTileConfig;
	declare _results: Partial<Record<TemplateKey, unknown>>;
	declare _featureRow?: "ready" | "missing";

	private _hass?: HomeAssistant;
	private _holdTimer?: ReturnType<typeof setTimeout>;
	/** Set when a long press fired, so the click that ends it doesn't also tap. */
	private _held = false;
	private readonly _templates = new TemplateSubscriptions(
		"vacuum-tile-card",
		(key, result) => {
			this._results = { ...this._results, [key]: result };
		},
	);

	constructor() {
		super();
		this._results = {};
	}

	static getConfigForm() {
		return configForm;
	}

	static getStubConfig(hass?: HomeAssistant): Partial<LovelaceCardConfig> {
		const entity =
			Object.keys(hass?.states ?? {}).find((id) => id.startsWith("vacuum.")) ??
			"";
		return { entity };
	}

	setConfig(config: LovelaceCardConfig): void {
		this._config = normalizeConfig(config);
		this._featureRow = undefined;
		if (this._config.features.length)
			loadFeatureRow({ type: "tile", entity: this._config.entity }).then(
				(ready) => {
					this._featureRow = ready ? "ready" : "missing";
				},
			);
		this._syncTemplates();
	}

	set hass(hass: HomeAssistant | undefined) {
		const previous = this._hass;
		this._hass = hass;
		for (const row of this.shadowRoot?.querySelectorAll(FEATURE_ROW) ?? [])
			(row as LovelaceCardElement).hass = hass;
		if (previous?.connection !== hass?.connection) this._syncTemplates();
		const config = this._config;
		const watched = config
			? [config.entity, config.battery_entity, config.charging_entity].filter(
					(id): id is string => id !== undefined,
				)
			: [];
		if (entitiesChanged(previous, hass, watched)) this.requestUpdate();
	}

	get hass(): HomeAssistant | undefined {
		return this._hass;
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this._syncTemplates();
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this._templates.clear();
		this._cancelHold();
	}

	private _syncTemplates(): void {
		const config = this._config;
		if (!config || !this.isConnected) return;
		this._templates.sync(
			this._hass?.connection,
			{
				state_detail: config.state_detail,
				lines: config.lines,
				warning: config.warning,
				active: config.active,
			},
			{ entity: config.entity },
		);
	}

	getGridOptions() {
		return { columns: 6, rows: 2, min_columns: 6, min_rows: 2 };
	}

	getCardSize(): number {
		return 2;
	}

	private _showFeatures(entity: HassEntity | undefined): boolean {
		const config = this._config;
		if (!config?.features.length || !entity) return false;
		// Until the template has rendered (or if it fails), the state decides.
		if (config.active && this._results.active !== undefined)
			return truthy(this._results.active);
		return config.features_states
			? config.features_states.includes(entity.state)
			: stateActive(entity);
	}

	private _run(action: ActionConfig): void {
		if (action.action !== "none")
			fireHassAction(this, action, this._config?.entity);
	}

	private _tapCard(event: Event): void {
		if (this._held) {
			this._held = false;
			return;
		}
		if (fromFeatureRow(event) || !this._config) return;
		this._run(this._config.tap_action);
	}

	private _keyCard(event: KeyboardEvent): void {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		if (this._config) this._run(this._config.tap_action);
	}

	private _startHold(event: PointerEvent): void {
		this._held = false;
		const config = this._config;
		if (!config || config.hold_action.action === "none") return;
		if (fromFeatureRow(event)) return;
		if (
			event
				.composedPath()
				.some((node) => (node as Element).classList?.contains("icon"))
		)
			return;
		this._cancelHold();
		this._holdTimer = setTimeout(() => {
			this._holdTimer = undefined;
			this._held = true;
			this._run(config.hold_action);
		}, HOLD_MS);
	}

	private _cancelHold(): void {
		clearTimeout(this._holdTimer);
		this._holdTimer = undefined;
	}

	private _tapIcon(event: Event): void {
		event.stopPropagation();
		if (this._config) this._run(this._config.icon_tap_action);
	}

	override render() {
		const config = this._config;
		if (!config) return nothing;
		const entity = this._hass?.states[config.entity];
		const name = entityName(this._hass, entity, config);
		const icon =
			config.icon ??
			(typeof entity?.attributes.icon === "string"
				? entity.attributes.icon
				: "mdi:robot-vacuum");
		const color = entity ? iconColor(entity) : undefined;
		const active = entity !== undefined && stateActive(entity);
		const detail = this._results.state_detail;
		const detailText =
			detail === undefined || detail === null ? "" : String(detail).trim();
		const stateText = entity
			? [this._hass?.formatEntityState?.(entity) ?? entity.state, detailText]
					.filter((part) => part !== "")
					.join(" · ")
			: "";
		const tappable = config.tap_action.action !== "none";
		const iconTappable = config.icon_tap_action.action !== "none";
		return html`<ha-card
			role=${tappable ? "button" : nothing}
			tabindex=${tappable ? "0" : nothing}
			aria-label=${tappable ? name : nothing}
			@click=${this._tapCard}
			@keydown=${this._keyCard}
			@pointerdown=${this._startHold}
			@pointerup=${this._cancelHold}
			@pointercancel=${this._cancelHold}
			@pointerleave=${this._cancelHold}
			@contextmenu=${(event: Event) => this._config?.hold_action.action !== "none" && event.preventDefault()}
		>
			${tappable ? html`<div class="background"><ha-ripple></ha-ripple></div>` : nothing}
			<div class="top">
				<div
					class="icon ${iconTappable ? "tappable" : ""}"
					style=${color ? `--_color: ${color}` : ""}
					role=${iconTappable ? "button" : nothing}
					tabindex=${iconTappable ? "0" : nothing}
					@click=${iconTappable ? this._tapIcon : nothing}
				>
					<ha-icon icon=${icon}></ha-icon>
					${truthy(this._results.warning) ? html`<span class="badge"><ha-icon icon=${config.warning_icon}></ha-icon></span>` : nothing}
				</div>
				<div class="info">
					<div class="name"><span class="text">${name}</span>${this._battery()}</div>
					<div class="state ${active ? "active" : ""}" style=${active && color ? `--_color: ${color}` : ""}>${stateText}</div>
				</div>
			</div>
			<div class="slot">${this._showFeatures(entity) ? this._features(config) : this._lines()}</div>
		</ha-card>`;
	}

	private _battery() {
		const config = this._config;
		const level = Number(
			config?.battery_entity
				? this._hass?.states[config.battery_entity]?.state
				: Number.NaN,
		);
		if (!Number.isFinite(level)) return nothing;
		const charging =
			config?.charging_entity !== undefined &&
			this._hass?.states[config.charging_entity]?.state === "on";
		return html`<span class="battery"
			><ha-icon icon=${batteryIcon(level, charging)} style="color: ${batteryColor(level)}"></ha-icon
			>${Math.round(level)} %</span
		>`;
	}

	private _lines() {
		const lines = splitLines(this._results.lines);
		if (!lines.length) return nothing;
		return html`<div class="lines">
			${lines.map(
				(parts) =>
					html`<div>${parts.map((part) => (part.bold ? html`<b>${part.text}</b>` : part.text))}</div>`,
			)}
		</div>`;
	}

	private _features(config: VacuumTileConfig) {
		if (this._featureRow === "missing")
			// See FEATURE_ROW in ha/feature-row.ts for what to check.
			return html`<div class="lines">Funktionen nicht verfügbar (HA-Element ${FEATURE_ROW} fehlt)</div>`;
		if (this._featureRow !== "ready") return nothing;
		return html`<hui-card-features
			.hass=${this._hass}
			.context=${{ entity_id: config.entity }}
			.features=${config.features}
			.position=${"bottom"}
			.columns=${1}
		></hui-card-features>`;
	}

	static override styles = css`
		:host {
			display: block;
			height: 100%;
		}
		ha-card {
			position: relative;
			box-sizing: border-box;
			height: 100%;
			display: flex;
			flex-direction: column;
			-webkit-tap-highlight-color: transparent;
		}
		ha-card[role="button"] {
			cursor: pointer;
		}
		ha-card:focus-visible {
			outline: 2px solid var(--accent-color, var(--primary-color));
			outline-offset: 2px;
		}
		/* As in HA's tile: the tap surface with the ripple lies under everything; text lets taps through,
		   only the icon and the feature buttons catch them. */
		.background {
			position: absolute;
			inset: 0;
			border-radius: inherit;
			overflow: hidden;
		}
		.top,
		.slot,
		hui-card-features {
			position: relative;
			pointer-events: none;
		}
		.top {
			flex: 1;
			min-height: 56px;
			display: flex;
			align-items: center;
			gap: 10px;
			padding: 0 12px 0 10px;
		}
		/* The stock tile icon (ha-tile-icon): 36 px, the state colour. Like HA, the 20 % backdrop, hover and press
		   exist only when the icon has an action (interactive); otherwise taps fall through to the card. */
		.icon {
			position: relative;
			flex: none;
			width: 36px;
			height: 36px;
			border-radius: var(--ha-tile-icon-border-radius, var(--ha-border-radius-pill, 50%));
			display: flex;
			align-items: center;
			justify-content: center;
			color: var(--_color, var(--state-inactive-color));
			--mdc-icon-size: 24px;
			--_backdrop-opacity: 0.2;
			pointer-events: none;
			transition: transform 180ms ease-in-out;
		}
		.icon ha-icon {
			position: relative;
		}
		.icon.tappable {
			cursor: pointer;
			pointer-events: auto;
			-webkit-tap-highlight-color: transparent;
		}
		.icon.tappable::before {
			content: "";
			position: absolute;
			inset: 0;
			border-radius: var(--ha-tile-icon-border-radius, var(--ha-border-radius-pill, 50%));
			background: var(--_color, var(--state-inactive-color));
			opacity: var(--_backdrop-opacity);
			transition: opacity 180ms ease-in-out;
		}
		.icon.tappable:hover {
			--_backdrop-opacity: 0.35;
		}
		.icon.tappable:active {
			transform: scale(1.2);
		}
		.icon.tappable:focus {
			outline: none;
		}
		.icon.tappable:focus-visible {
			box-shadow: 0 0 0 2px var(--_color, var(--state-inactive-color));
		}
		/* The stock alert badge (ha-tile-badge): 16 px, orange, white 12 px icon, 3 px out */
		.badge {
			position: absolute;
			top: -3px;
			right: -3px;
			width: 16px;
			height: 16px;
			border-radius: var(--ha-border-radius-md, 50%);
			background: var(--orange-color, #ff9800);
			color: var(--white-color, #fff);
			display: flex;
			align-items: center;
			justify-content: center;
			--mdc-icon-size: 12px;
		}
		.info {
			flex: 1;
			min-width: 0;
		}
		.name {
			display: flex;
			align-items: center;
			gap: 4px;
			font-size: var(--ha-tile-info-primary-font-size, var(--ha-font-size-m, 14px));
			line-height: var(--ha-tile-info-primary-line-height, var(--ha-line-height-normal, 1.41));
			font-weight: var(--ha-tile-info-primary-font-weight, var(--ha-font-weight-medium, 500));
			letter-spacing: var(--ha-tile-info-primary-letter-spacing, 0.1px);
			color: var(--ha-tile-info-primary-color, var(--primary-text-color));
			white-space: nowrap;
		}
		.name .text {
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.battery {
			margin-left: auto;
			flex: none;
			display: inline-flex;
			align-items: center;
			gap: 1px;
			font-size: var(--ha-font-size-s, 12px);
			font-weight: var(--ha-font-weight-medium, 500);
			font-variant-numeric: tabular-nums;
			color: var(--secondary-text-color);
			--mdc-icon-size: 16px;
		}
		.state,
		.lines {
			font-size: var(--ha-tile-info-secondary-font-size, var(--ha-font-size-s, 12px));
			letter-spacing: var(--ha-tile-info-secondary-letter-spacing, 0.4px);
			font-weight: var(--ha-tile-info-secondary-font-weight, var(--ha-font-weight-normal, 400));
			color: var(--ha-tile-info-secondary-color, var(--secondary-text-color));
		}
		.state {
			line-height: var(--ha-tile-info-secondary-line-height, var(--ha-line-height-condensed, 1.2));
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.state.active {
			color: var(--_color);
		}
		/* The stock feature slot: 42 px high, 12 px in from the sides and the bottom */
		.slot {
			flex: none;
			height: var(--feature-height, 42px);
			margin: 0 var(--ha-space-3, 12px) var(--ha-space-3, 12px);
			display: flex;
			flex-direction: column;
			justify-content: center;
		}
		.lines {
			line-height: 16px;
			display: flex;
			flex-direction: column;
			gap: 2px;
			min-width: 0;
		}
		.lines div {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.lines b {
			font-weight: var(--ha-font-weight-medium, 500);
			color: var(--primary-text-color);
		}
	`;
}

/** The configured name, else the entity's name as the stock tile shows it (`hass.formatEntityName`). */
function entityName(
	hass: HomeAssistant | undefined,
	entity: HassEntity | undefined,
	config: VacuumTileConfig,
): string {
	if (entity && hass?.formatEntityName)
		return hass.formatEntityName(entity, config.name);
	return (
		config.name ?? String(entity?.attributes.friendly_name ?? config.entity)
	);
}

/** The icon colour: HA's state colour; errors in the theme's error red unless the theme sets one. */
function iconColor(entity: HassEntity): string | undefined {
	if (entity.state === "error")
		return "var(--state-vacuum-error-color, var(--error-color))";
	return stateColorCss(entity);
}

registerCard("vacuum-tile-card", VacuumTileCard, {
	name: "Saugroboter-Kachel",
	description:
		"Saugroboter mit Status, Akku und Zeilen darunter; im Betrieb Funktionen statt Zeilen",
	preview: true,
});
