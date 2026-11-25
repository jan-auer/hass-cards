import { css, html, LitElement, nothing } from "lit";
import { fireHassAction } from "../../ha/actions";
import { entitiesChanged, isActive } from "../../ha/entities";
import {
	FEATURE_ROW,
	fromFeatureRow,
	loadFeatureRow,
} from "../../ha/feature-row";
import { registerCard } from "../../ha/register";
import type {
	HomeAssistant,
	LovelaceCardConfig,
	LovelaceCardElement,
} from "../../ha/types";
import { activeAlert, alertIcon } from "./alerts";
import { normalizeConfig, type RoomTileConfig, roomColor } from "./config";
import "./editor";
import { highlightStyle } from "./highlight";
import { sensorEntities, sensorLine } from "./sensors";

// Stock tile metrics (frontend 20261028.6): 36 px icon, name from 56 px, features 42 px + 12 px gaps.
/** The features' side inset (12 px); the photo's left edge lines up with it. */
const PHOTO_LEFT = 12;
const ROW_HEIGHT = 56;
const FEATURE_HEIGHT = 42;
const FEATURE_GAP = 12;
/**
 * The photo: a rounded square as large as the stock icon it covers. It can't be larger: the stock name
 * starts at 56 px and an overlay can't move it, so 36 px at 12 px leaves the stock 8 px gap.
 */
const PHOTO_SIZE = 36;

interface AreaCardElement extends LovelaceCardElement {
	layout?: string;
	getGridOptions?(): Record<string, unknown>;
	getCardSize?(): number | Promise<number>;
}

/**
 * Room card C: HA's stock area card (created through the documented `loadCardHelpers()`), with the
 * room's identity (photo over the icon, or a colour strip) and a highlight while the room is active.
 * Name, sensors, alerts, features, actions and the editor's layout stay stock; the highlight only sets
 * the card's public theme variables (`--ha-card-background`, `--ha-card-box-shadow`).
 *
 * `identity: photo-large` draws its own header instead (photo, name, the area's sensors) and puts the
 * features below in HA's own feature row element, `hui-card-features`. That element is internal: if HA
 * renames it or changes its properties (hass, context, features, position, columns, color), these
 * tiles lose their feature row and show a hint; the other identities don't depend on it.
 */
export class RoomTileCard extends LitElement {
	static override properties = {
		_config: { state: true },
		_inner: { state: true },
		_featureRow: { state: true },
	};

	declare _config?: RoomTileConfig;
	declare _inner?: AreaCardElement;
	/** For `photo-large`: whether HA's feature row element is defined ("missing" after a timeout). */
	declare _featureRow?: "ready" | "missing";
	/** Resolves once the stock card exists (tests and callers that need it). */
	ready: Promise<void> = Promise.resolve();

	private _hass?: HomeAssistant;
	private _layout?: string;
	private _preview?: boolean;
	private _creation = 0;
	private _alertCandidates: string[] = [];
	private _candidatesFor?: HomeAssistant["entities"];
	private _featureContext: Record<string, unknown> = {};

	static getConfigElement(): HTMLElement {
		return document.createElement("room-tile-card-editor");
	}

	static getStubConfig(hass?: HomeAssistant): Partial<LovelaceCardConfig> {
		const area = Object.keys(hass?.areas ?? {})[0] ?? "";
		return { area, identity: "strip", highlight: "none" };
	}

	set hass(hass: HomeAssistant | undefined) {
		const previous = this._hass;
		this._hass = hass;
		if (this._inner) this._inner.hass = hass;
		// The feature rows follow every state change, like inside a stock card.
		for (const row of this.shadowRoot?.querySelectorAll(FEATURE_ROW) ?? [])
			(row as LovelaceCardElement).hass = hass;
		if (this._relevantChange(previous, hass)) this.requestUpdate();
	}

	get hass(): HomeAssistant | undefined {
		return this._hass;
	}

	/** HA's grid layout hint; the stock card reads it. */
	set layout(layout: string | undefined) {
		this._layout = layout;
		if (this._inner) this._inner.layout = layout;
	}

	get layout(): string | undefined {
		return this._layout;
	}

	set preview(preview: boolean | undefined) {
		this._preview = preview;
		if (this._inner) this._inner.preview = preview;
	}

	get preview(): boolean | undefined {
		return this._preview;
	}

	setConfig(config: LovelaceCardConfig): void {
		this._config = normalizeConfig(config);
		this._featureContext = {
			area_id: this._config.area,
			exclude_entities: this._config.exclude_entities,
		};
		if (this._config.identity === "photo-large") {
			this._creation++;
			this._inner = undefined;
			this.ready = this._loadFeatureRow(this._config.area_card);
		} else {
			this.ready = this._createAreaCard(this._config.area_card);
		}
	}

	private async _loadFeatureRow(config: LovelaceCardConfig): Promise<void> {
		this._featureRow = (await loadFeatureRow(config)) ? "ready" : "missing";
	}

	private async _createAreaCard(config: LovelaceCardConfig): Promise<void> {
		const creation = ++this._creation;
		const helpers = await window.loadCardHelpers?.();
		if (!helpers) throw new Error("loadCardHelpers ist nicht verfügbar");
		if (creation !== this._creation) return;
		const element = helpers.createCardElement(config) as AreaCardElement;
		element.hass = this._hass;
		element.layout = this._layout;
		element.preview = this._preview;
		this._inner = element;
	}

	getGridOptions() {
		// photo-large has no stock card: the same rule as the stock area card below.
		const fromStock = this._inner?.getGridOptions?.();
		if (fromStock) return fromStock;
		// The stock area card's own rule for a compact card, until it has loaded.
		const config = this._config;
		const features = Array.isArray(config?.area_card.features)
			? config.area_card.features.length
			: 0;
		const inline = config?.features_position === "inline" && features > 0;
		const rows = 1 + (inline ? Math.ceil((features - 1) / 2) : features);
		return {
			columns: inline ? 12 : 6,
			rows,
			min_columns: inline ? 12 : 6,
			min_rows: rows,
		};
	}

	getCardSize(): number | Promise<number> {
		return (
			this._inner?.getCardSize?.() ?? 1 + (this._config?.feature_rows ?? 0)
		);
	}

	/** Binary sensors of the area (for the badge on the photo), recomputed when the registry changes. */
	private _candidates(hass: HomeAssistant | undefined): string[] {
		const identity = this._config?.identity;
		if ((identity !== "photo" && identity !== "photo-large") || !hass?.entities)
			return [];
		if (this._candidatesFor !== hass.entities) {
			this._candidatesFor = hass.entities;
			this._alertCandidates = Object.keys(hass.entities).filter((id) =>
				id.startsWith("binary_sensor."),
			);
		}
		return this._alertCandidates;
	}

	private _relevantChange(
		previous: HomeAssistant | undefined,
		next: HomeAssistant | undefined,
	): boolean {
		if (!previous || !next) return previous !== next;
		if (previous.areas !== next.areas || previous.entities !== next.entities)
			return true;
		const config = this._config;
		const watched = [
			...(config?.highlight_entities ?? []),
			...this._candidates(next),
			...(config?.identity === "photo-large"
				? sensorEntities(next.areas?.[config.area])
				: []),
		];
		return entitiesChanged(previous, next, watched);
	}

	private _isActive(): boolean {
		const config = this._config;
		return (
			config !== undefined &&
			config.highlight !== "none" &&
			config.highlight_entities.some((id) => isActive(this._hass, id))
		);
	}

	protected override updated(): void {
		const config = this._config;
		if (!config) return;
		this.style.setProperty("--_rc", roomColor(config.color));
		// The card whose theme variables carry the highlight: the stock card, or our own header card.
		const inner =
			config.identity === "photo-large"
				? this.shadowRoot?.querySelector<HTMLElement>("ha-card.large")
				: this._inner;
		if (!inner) return;
		const dark = this._hass?.themes?.darkMode === true ? "dark" : "light";
		if (!this._isActive() || config.highlight === "none") {
			inner.style.removeProperty("--ha-card-background");
			inner.style.removeProperty("--ha-card-box-shadow");
			return;
		}
		const style = highlightStyle(
			config.highlight,
			dark,
			roomColor(config.color),
		);
		if (style.background)
			inner.style.setProperty("--ha-card-background", style.background);
		else inner.style.removeProperty("--ha-card-background");
		inner.style.setProperty("--ha-card-box-shadow", style.shadow);
	}

	override render() {
		const config = this._config;
		if (!config) return nothing;
		if (config.identity === "photo-large") return this._large(config);
		return html`
			<div class="card">${this._inner ?? nothing}</div>
			${config.identity === "strip" ? html`<div class="clip"><div class="strip"></div></div>` : nothing}
			${config.identity === "photo" ? this._photo(config) : nothing}
		`;
	}

	private _photo(config: RoomTileConfig) {
		const picture = config.image ?? this._hass?.areas?.[config.area]?.picture;
		if (!picture) return nothing;
		const featuresHeight =
			config.feature_rows > 0
				? config.feature_rows * (FEATURE_HEIGHT + FEATURE_GAP)
				: 0;
		// Centred on the stock icon: in the info row above the features, or in the row's first 56 px.
		const top =
			config.features_position === "inline"
				? `${ROW_HEIGHT / 2 - PHOTO_SIZE / 2}px`
				: `calc((100% - ${featuresHeight}px) / 2 - ${PHOTO_SIZE / 2}px)`;
		const alert = activeAlert(
			this._hass,
			config.area,
			config.alert_classes,
			config.exclude_entities,
		);
		return html`<div
			class="photo"
			style="background-image: url('${picture}'); top: ${top}; left: ${PHOTO_LEFT}px"
		>${alert ? html`<span class="badge"><ha-icon icon=${alertIcon(this._hass, alert)}></ha-icon></span>` : nothing}</div>`;
	}

	private _tapLarge(event: Event): void {
		// Taps on the feature row's buttons are the row's (spacers and gaps pass through to the card).
		if (fromFeatureRow(event)) return;
		const action = this._config?.area_card.tap_action as
			| { action: string }
			| undefined;
		if (action && action.action !== "none")
			fireHassAction(this, action as Parameters<typeof fireHassAction>[1]);
	}

	private _large(config: RoomTileConfig) {
		const area = this._hass?.areas?.[config.area];
		const picture = config.image ?? area?.picture;
		const name = String(config.area_card.name ?? area?.name ?? config.area);
		const sensors = sensorLine(this._hass, area, config.sensor_classes);
		const features = Array.isArray(config.area_card.features)
			? config.area_card.features
			: [];
		const inline = config.features_position === "inline";
		const inlineFeatures = inline ? features.slice(0, 1) : [];
		const below = inline ? features.slice(1) : features;
		const action = config.area_card.tap_action as
			| { action?: string }
			| undefined;
		const tappable = action !== undefined && action.action !== "none";
		const alert = activeAlert(
			this._hass,
			config.area,
			config.alert_classes,
			config.exclude_entities,
		);
		const badge = alert
			? html`<span class="badge"><ha-icon icon=${alertIcon(this._hass, alert)}></ha-icon></span>`
			: nothing;
		return html`<ha-card
			class="large ${inline ? "inline" : "bottom"}"
			role=${tappable ? "button" : nothing}
			tabindex=${tappable ? "0" : nothing}
			aria-label=${tappable ? name : nothing}
			@click=${this._tapLarge}
		>
			${tappable ? html`<div class="background ${config.highlight === "room" ? "room-colour" : ""}"><ha-ripple></ha-ripple></div>` : nothing}
			<div class="header">
				${
					picture
						? html`<div class="photo" style="background-image: url('${picture}')">${badge}</div>`
						: html`<div class="photo chip"><ha-icon icon=${area?.icon ?? "mdi:texture-box"}></ha-icon>${badge}</div>`
				}
				<div class="info">
					<div class="name">${name}</div>
					${sensors ? html`<div class="sensors">${sensors}</div>` : nothing}
				</div>
				${inlineFeatures.length ? this._features(inlineFeatures, "inline", 1) : nothing}
			</div>
			${below.length ? html`<div class="below">${this._features(below, "bottom", inline ? Math.min(below.length, 2) : 1)}</div>` : nothing}
		</ha-card>`;
	}

	private _features(features: unknown[], position: string, columns: number) {
		if (this._featureRow === "missing")
			// See FEATURE_ROW in ha/feature-row.ts for what to check.
			return html`<div class="hint">Funktionen nicht verfügbar (HA-Element ${FEATURE_ROW} fehlt, room-tile-card: FEATURE_ROW)</div>`;
		if (this._featureRow !== "ready") return nothing;
		return html`<hui-card-features
			.hass=${this._hass}
			.context=${this._featureContext}
			.features=${features}
			.position=${position}
			.columns=${columns}
			.color=${this._config?.color}
		></hui-card-features>`;
	}

	static override styles = css`
		:host {
			display: block;
			position: relative;
			height: 100%;
			/* The theme's card surface, resolved here so the highlight can layer over it on the stock card */
			--_card-background: var(--ha-card-background, var(--card-background-color, white));
			--_card-shadow: var(--ha-card-box-shadow, 0 0 0 0 transparent);
		}
		.card {
			height: 100%;
		}
		.card > * {
			display: block;
			height: 100%;
		}
		/* Clips the strip to the card's corners without clipping the card's own shadow */
		.clip {
			position: absolute;
			inset: 0;
			overflow: hidden;
			border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg, 12px));
			pointer-events: none;
		}
		.strip {
			width: 4px;
			height: 100%;
			background: var(--_rc);
		}
		.photo {
			position: absolute;
			width: 36px;
			height: 36px;
			border-radius: 10px;
			background-position: center;
			background-size: cover;
			pointer-events: none;
		}
		/*
		 * photo-large: the stock tile's structure with a 42 px photo. The photo sits on the feature row's 12 px
		 * inset, centred in the row above the features (12 px from the top in a 2-row tile); type as in the
		 * stock tile's info. Features below get the stock slot's 0 12px 12px padding; an inline feature takes
		 * the right-hand grid column, 36 px high, as in the stock tile.
		 */
		ha-card.large {
			position: relative;
			box-sizing: border-box;
			height: 100%;
			display: flex;
			flex-direction: column;
			-webkit-tap-highlight-color: transparent;
		}
		ha-card.large[role="button"] {
			cursor: pointer;
		}
		ha-card.large:focus-visible {
			outline: 2px solid var(--accent-color, var(--primary-color));
			outline-offset: 2px;
		}
		.large .header {
			flex: 1;
			min-height: 56px;
			display: flex;
			align-items: center;
			gap: 10px;
			padding: 0 12px;
		}
		.large .photo {
			position: relative;
			flex: none;
			width: 42px;
			height: 42px;
		}
		/* No backdrop: like HA's tile icon, only an icon with its own action gets one (this one has none) */
		.large .chip {
			display: flex;
			align-items: center;
			justify-content: center;
			color: var(--_rc);
			--mdc-icon-size: 24px;
		}
		.large .info {
			flex: 1;
			min-width: 0;
		}
		.large .name {
			font-size: var(--ha-tile-info-primary-font-size, var(--ha-font-size-m, 14px));
			line-height: var(--ha-tile-info-primary-line-height, var(--ha-line-height-normal, 1.41));
			font-weight: var(--ha-tile-info-primary-font-weight, var(--ha-font-weight-medium, 500));
			letter-spacing: var(--ha-tile-info-primary-letter-spacing, 0.1px);
			color: var(--ha-tile-info-primary-color, var(--primary-text-color));
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.large .sensors {
			font-size: var(--ha-tile-info-secondary-font-size, var(--ha-font-size-s, 12px));
			line-height: var(--ha-tile-info-secondary-line-height, var(--ha-line-height-condensed, 1.2));
			letter-spacing: var(--ha-tile-info-secondary-letter-spacing, 0.4px);
			font-weight: var(--ha-tile-info-secondary-font-weight, var(--ha-font-weight-normal, 400));
			color: var(--ha-tile-info-secondary-color, var(--primary-text-color));
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.large .below {
			padding: 0 var(--ha-space-3, 12px) var(--ha-space-3, 12px);
		}
		/* As in HA's tile: the tap surface (with the ripple) lies under everything; content and the feature
		   row let taps through, only the feature buttons catch them. So a tap on a spacer or gap lands on
		   the card, and pressing a button doesn't ripple the whole card. */
		/* As in HA's tile container: clipped to the card's radius (spelled out, since inherit resolves to 0
		   through ha-card's slot) over its border, 4 % on hover, 12 % pressed. The colour is the stock area
		   card's --state-icon-color; only the room highlight uses the room's colour. */
		.large .background {
			position: absolute;
			inset: 0;
			margin: calc(-1 * var(--ha-card-border-width, 1px));
			border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg, 12px));
			overflow: hidden;
			--ha-ripple-color: var(--state-icon-color);
			--ha-ripple-hover-opacity: 0.04;
			--ha-ripple-pressed-opacity: 0.12;
		}
		.large .background.room-colour {
			--ha-ripple-color: var(--_rc);
		}
		.large .header,
		.large .below,
		.large hui-card-features {
			position: relative;
			pointer-events: none;
		}
		.large .header hui-card-features {
			flex: none;
			/* The stock slot's width (half the card minus half the grid gap minus its 12 px end padding), here
			   measured inside the header's 12 px padding */
			width: calc(50% - var(--ha-space-3, 12px) - var(--column-gap, 0px) / 2);
			--feature-height: var(--ha-space-9, 36px);
		}
		.hint {
			font-size: 12px;
			color: var(--secondary-text-color);
		}
		/* The stock alert badge (ha-tile-badge on the icon): 16 px, orange, white 12 px icon, 3 px out */
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
	`;
}

registerCard("room-tile-card", RoomTileCard, {
	documentation: "room-tile",
	name: "Raum-Kachel",
	description:
		"Bereichskarte mit Foto oder Farbstreifen und Hervorhebung, wenn der Raum aktiv ist",
	preview: true,
});
