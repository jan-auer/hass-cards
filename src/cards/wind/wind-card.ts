import { css, html, LitElement, nothing, svg } from "lit";
import { fireHassAction } from "../../ha/actions";
import { entitiesChanged } from "../../ha/entities";
import { decimal, languageOf, numericState } from "../../ha/format";
import { registerCard } from "../../ha/register";
import { NEUTRAL_TRACK, reflectDarkMode } from "../../ha/theme";
import type { HomeAssistant, LovelaceCardConfig } from "../../ha/types";
import { normalizeConfig, STUB_ENTITIES, type WindConfig } from "./config";
import { beaufort, cardinal, kmh } from "./wind";

const DASH = "–";
const SIZE = 136;
const CENTER = SIZE / 2;
const RADIUS = CENTER - 10;
/** Compass letters, German (O for Ost). */
const LETTERS: [string, number][] = [
	["N", 0],
	["O", 90],
	["S", 180],
	["W", 270],
];

/** A compass bearing (0 = north, clockwise) as SVG coordinates at `distance` from the centre. */
function point(degrees: number, distance: number): [number, number] {
	const angle = ((degrees - 90) * Math.PI) / 180;
	return [
		CENTER + Math.cos(angle) * distance,
		CENTER + Math.sin(angle) * distance,
	];
}

/** The ring's ticks every 10°: 7 px at the cardinals, 5 px every 30°, 3 px otherwise. */
const TICKS = Array.from({ length: 36 }, (_, index) => {
	const degrees = index * 10;
	const length = degrees % 90 === 0 ? 7 : degrees % 30 === 0 ? 5 : 3;
	const [x1, y1] = point(degrees, RADIUS);
	const [x2, y2] = point(degrees, RADIUS - length);
	return svg`<line class="tick ${degrees % 90 === 0 ? "cardinal" : ""}" x1=${x1} y1=${y1} x2=${x2} y2=${y2}></line>`;
});

/**
 * Wind: a compass with the current speed in the middle and an arrowhead on the ring
 * pointing from where the wind comes from toward the centre; beside it gusts, direction, the 10-minute mean
 * direction, today's peak gust and the Beaufort force.
 */
export class WindCard extends LitElement {
	static override properties = { _config: { state: true } };

	declare _config?: WindConfig;
	private _hass?: HomeAssistant;

	static getStubConfig(): Partial<LovelaceCardConfig> {
		return { ...STUB_ENTITIES };
	}

	setConfig(config: LovelaceCardConfig): void {
		this._config = normalizeConfig(config);
	}

	set hass(hass: HomeAssistant | undefined) {
		const previous = this._hass;
		this._hass = hass;
		reflectDarkMode(this, hass);
		const config = this._config;
		const watched = config
			? [
					config.speed,
					config.gust,
					config.direction,
					config.direction_avg,
					config.max_today,
				]
			: [];
		if (entitiesChanged(previous, hass, watched)) this.requestUpdate();
	}

	get hass(): HomeAssistant | undefined {
		return this._hass;
	}

	getGridOptions() {
		return { columns: 12, rows: 3, min_columns: 6, min_rows: 3 };
	}

	getCardSize(): number {
		return 3;
	}

	private _unit(entityId: string): string | undefined {
		const unit = this._hass?.states[entityId]?.attributes.unit_of_measurement;
		return typeof unit === "string" ? unit : undefined;
	}

	/** `24,5 km/h`, or a dash. */
	private _speedText(entityId: string): string {
		const value = numericState(this._hass, entityId);
		if (value === undefined) return DASH;
		const text = decimal(value, 1, languageOf(this._hass));
		const unit = this._unit(entityId);
		return unit ? `${text} ${unit}` : text;
	}

	/** `SO · 130°`, or a dash. */
	private _directionText(entityId: string): string {
		const degrees = numericState(this._hass, entityId);
		if (degrees === undefined) return DASH;
		return `${cardinal(degrees)} · ${Math.round(degrees)}°`;
	}

	private _tap(): void {
		const config = this._config;
		if (config && config.tap_action.action !== "none")
			fireHassAction(this, config.tap_action, config.speed);
	}

	private _key(event: KeyboardEvent): void {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		this._tap();
	}

	override render() {
		const config = this._config;
		if (!config) return nothing;
		const speed = numericState(this._hass, config.speed);
		const direction = numericState(this._hass, config.direction);
		const force =
			speed === undefined
				? undefined
				: beaufort(kmh(speed, this._unit(config.speed)));
		const tappable = config.tap_action.action !== "none";
		const rows: [string, string][] = [
			["Böen", this._speedText(config.gust)],
			["Richtung", this._directionText(config.direction)],
			["Mittel 10 min", this._directionText(config.direction_avg)],
			["Spitze heute", this._speedText(config.max_today)],
			["Beaufort", force ? `${force.force} · ${force.word}` : DASH],
		];
		return html`<ha-card
			role=${tappable ? "button" : nothing}
			tabindex=${tappable ? "0" : nothing}
			aria-label=${tappable ? "Wind" : nothing}
			@click=${this._tap}
			@keydown=${this._key}
		>
			<div class="header">
				<ha-icon icon="mdi:weather-windy"></ha-icon>Wind
				${tappable ? html`<ha-icon class="chevron" icon="mdi:chevron-right"></ha-icon>` : nothing}
			</div>
			<div class="body">
				${this._compass(speed, direction, this._unit(config.speed))}
				<div class="rows">
					${rows.map(([label, value]) => html`<div class="row"><span>${label}</span><span>${value}</span></div>`)}
				</div>
			</div>
		</ha-card>`;
	}

	private _compass(
		speed: number | undefined,
		direction: number | undefined,
		unit: string | undefined,
	) {
		return html`<svg class="compass" width=${SIZE} height=${SIZE} viewBox="0 0 ${SIZE} ${SIZE}">
			<circle class="ring" cx=${CENTER} cy=${CENTER} r=${RADIUS}></circle>
			${TICKS}
			${LETTERS.map(([letter, degrees]) => {
				const [x, y] = point(degrees, RADIUS - 16);
				return svg`<text class="letter" x=${x} y=${y + 4}>${letter}</text>`;
			})}
			${direction === undefined ? nothing : this._arrow(direction)}
			<text class="speed" x=${CENTER} y=${CENTER + 4}>${speed === undefined ? DASH : Math.round(speed)}</text>
			<text class="unit" x=${CENTER} y=${CENTER + 20}>${unit ?? ""}</text>
		</svg>`;
	}

	/** Tip inside the ring, base just outside it, at the bearing the wind comes from. */
	private _arrow(direction: number) {
		const spread = (0.14 * 180) / Math.PI;
		const points = [
			point(direction, RADIUS - 22),
			point(direction + spread, RADIUS + 6),
			point(direction - spread, RADIUS + 6),
		]
			.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
			.join(" ");
		return svg`<polygon class="arrow" points=${points}></polygon>`;
	}

	static override styles = css`
		:host {
			display: block;
			height: 100%;
			--_track: ${NEUTRAL_TRACK};
			--_arrow: var(--wind-card-arrow-color, #2f7bea);
		}
		:host([dark]) {
			--_arrow: var(--wind-card-arrow-color, #5aa9ff);
		}
		ha-card {
			box-sizing: border-box;
			height: 100%;
			padding: 12px 14px;
			display: flex;
			flex-direction: column;
			gap: 4px;
			-webkit-tap-highlight-color: transparent;
		}
		ha-card[role="button"] {
			cursor: pointer;
		}
		ha-card:focus-visible {
			outline: 2px solid var(--accent-color, var(--primary-color));
			outline-offset: 2px;
		}
		.header {
			display: flex;
			align-items: center;
			gap: 5px;
			height: 16px;
			font-size: 11px;
			font-weight: 600;
			letter-spacing: 0.05em;
			text-transform: uppercase;
			color: var(--secondary-text-color);
			white-space: nowrap;
			--mdc-icon-size: 15px;
		}
		.header .chevron {
			margin-left: auto;
			--mdc-icon-size: 18px;
			opacity: 0.6;
		}
		.body {
			flex: 1;
			min-height: 0;
			display: flex;
			align-items: center;
			gap: 14px;
		}
		.compass {
			flex: none;
			display: block;
		}
		.ring {
			fill: none;
			stroke: var(--_track);
		}
		.tick {
			stroke: var(--secondary-text-color);
			stroke-opacity: 0.6;
			stroke-width: 1;
		}
		.tick.cardinal {
			stroke-width: 1.6;
		}
		.letter,
		.speed,
		.unit {
			text-anchor: middle;
		}
		.letter {
			font-size: 11px;
			font-weight: 600;
			fill: var(--secondary-text-color);
		}
		.arrow {
			fill: var(--_arrow);
		}
		.speed {
			font-size: 26px;
			font-weight: 500;
			fill: var(--primary-text-color);
		}
		.unit {
			font-size: 11px;
			font-weight: 500;
			fill: var(--secondary-text-color);
		}
		.rows {
			flex: 1;
			min-width: 0;
		}
		.row {
			display: flex;
			justify-content: space-between;
			gap: 8px;
			padding: 2px 0;
			font-size: 13px;
			line-height: 17px;
			white-space: nowrap;
			border-bottom: 1px solid var(--divider-color);
		}
		.row:last-child {
			border-bottom: 0;
		}
		.row span:first-child {
			color: var(--secondary-text-color);
		}
		.row span:last-child {
			font-variant-numeric: tabular-nums;
		}
	`;
}

registerCard("wind-card", WindCard, {
	documentation: "wind",
	name: "Wind",
	description:
		"Kompass mit Windrichtung und Geschwindigkeit; Böen, Mittel, Tagesspitze und Beaufort daneben",
	preview: true,
});
