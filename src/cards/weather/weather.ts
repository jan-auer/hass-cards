import {
	css,
	html,
	LitElement,
	nothing,
	type PropertyValues,
	type TemplateResult,
} from "lit";
import { spark, sparkStyles } from "../../charts/spark";
import { fireHassAction } from "../../ha/actions";
import { entitiesChanged } from "../../ha/entities";
import { decimal, languageOf, numericState } from "../../ha/format";
import { registerCard } from "../../ha/register";
import { reflectDarkMode } from "../../ha/theme";
import type { HomeAssistant, LovelaceCardConfig } from "../../ha/types";
import { CONDITION_WORDS, weatherIcon, weatherIconStyles } from "./condition";
import {
	configForm,
	normalizeConfig,
	type WetterConfig,
	watchedEntities,
} from "./config";
import {
	curveValues,
	fetchHourly,
	type HourlyStat,
	layoutFor,
	rainBars,
	todayRange,
} from "./history";

const REFRESH_MS = 10 * 60_000;
const PADDING = 12;
const FULL_TEXT_COLUMN = 160;
const FULL_GAP = 14;
/** The card's 1 px border on each side. */
const BORDERS = 2;

/**
 * A weather summary card: temperature, the forecast model's icon, "💧 63 % · ↑13° ↓9°" (the rain rate while it
 * rains) and the measured 24 h curve. Half width (6×2) by default; the full-width layout follows the width.
 */
export class WeatherSummaryCard extends LitElement {
	static override properties = {
		_config: { state: true },
		_hourly: { state: true },
		_width: { state: true },
		hass: { attribute: false },
	};

	declare _config?: WetterConfig;
	declare _hourly?: Record<string, HourlyStat[]>;
	declare _width: number;
	declare hass?: HomeAssistant;

	private _watched: string[] = [];
	private _timer?: ReturnType<typeof setInterval>;
	/** A history request is in flight; avoids duplicate requests while hass updates arrive. */
	private _loading = false;
	private readonly _resizeObserver = new ResizeObserver(([entry]) => {
		const width = Math.round(entry.contentRect.width);
		if (width > 0 && width !== this._width) this._width = width;
	});

	constructor() {
		super();
		this._width = 171;
	}

	static getConfigForm() {
		return configForm;
	}

	static getStubConfig(): Partial<WetterConfig> {
		return { temperature: "sensor.temperature" };
	}

	setConfig(config: LovelaceCardConfig): void {
		this._config = normalizeConfig(config);
		this._watched = watchedEntities(this._config);
		this._hourly = undefined;
		if (this.isConnected) this._refresh();
	}

	getCardSize(): number {
		return 3;
	}

	getGridOptions() {
		return { columns: 6, rows: 2, min_columns: 6, min_rows: 2, max_rows: 2 };
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this._resizeObserver.observe(this);
		this._refresh();
		this._timer = setInterval(() => this._refresh(), REFRESH_MS);
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this._resizeObserver.disconnect();
		clearInterval(this._timer);
	}

	/** `hass` changes on every state change in the house; only this card's entities matter. */
	protected override shouldUpdate(changed: PropertyValues<this>): boolean {
		if (changed.size === 1 && changed.has("hass")) {
			const previous = changed.get("hass") as HomeAssistant | undefined;
			return entitiesChanged(previous, this.hass, this._watched);
		}
		return true;
	}

	/** Fetch as soon as the card is attached and has hass, however the first update was batched. */
	protected override updated(): void {
		if (this.isConnected && this.hass && !this._hourly && !this._loading)
			this._refresh();
	}

	private _refresh(): void {
		const config = this._config;
		if (!config || !this.hass) return;
		const ids = [config.temperature, config.rain_rate].filter(
			(id): id is string => !!id,
		);
		this._loading = true;
		fetchHourly(this.hass, ids)
			.then((hourly) => {
				this._hourly = hourly;
			})
			.catch((error: unknown) => {
				// The card still shows the current values; only the curve and high/low are missing.
				console.warn("weather-summary-card: Verlauf nicht geladen", error);
			})
			.finally(() => {
				this._loading = false;
			});
	}

	private _tap(): void {
		const action = this._config?.tap_action;
		if (action && action.action !== "none") fireHassAction(this, action);
	}

	protected override willUpdate(): void {
		reflectDarkMode(this, this.hass);
	}

	override render() {
		const config = this._config;
		if (!config) return nothing;
		const language = languageOf(this.hass);
		const temperature = numericState(this.hass, config.temperature);
		const humidity = numericState(this.hass, config.humidity);
		const rate = numericState(this.hass, config.rain_rate) ?? 0;
		// The piezo state stays on while the sensor is wet after rain; only a rate counts.
		const raining = rate > 0;
		const condition =
			(config.condition && this.hass?.states[config.condition]?.state) || "";
		const night = config.sun
			? this.hass?.states[config.sun]?.state === "below_horizon"
			: false;
		const layout = layoutFor(this._width, config.layout);
		const tappable =
			config.tap_action !== undefined && config.tap_action.action !== "none";

		const temperatureRows = this._hourly?.[config.temperature] ?? [];
		const midnight = new Date();
		midnight.setHours(0, 0, 0, 0);
		// Only with the statistics: before they arrive, "today" would be just the current reading.
		const range =
			temperature !== undefined && this._hourly
				? todayRange(temperatureRows, temperature, midnight.getTime())
				: undefined;
		const curve =
			temperature !== undefined && this._hourly
				? curveValues(temperatureRows, temperature)
				: undefined;
		const bars =
			raining && curve
				? rainBars(
						this._hourly?.[config.rain_rate ?? ""] ?? [],
						curve.length,
						rate,
					)
				: [];

		const humidityText =
			humidity !== undefined
				? html`<ha-icon class="drop" icon="mdi:water-outline"></ha-icon>${Math.round(humidity)} %`
				: nothing;
		const rainText = html`<ha-icon class="rain" icon="mdi:weather-pouring"></ha-icon><b>${decimal(rate, 1, language)} mm/h</b>`;
		const dot = html`<span class="dot">·</span>`;
		const temperatureText =
			temperature !== undefined ? `${decimal(temperature, 1, language)}°` : "–";

		const parts: Parts = {
			temperatureText,
			condition,
			night,
			raining,
			rainText,
			humidityText,
			dot,
			range,
			curve,
			bars,
			language,
			rainToday: numericState(this.hass, config.rain_today),
		};
		const content =
			layout === "full" ? this._renderFull(parts) : this._renderHalf(parts);
		return html`
			<ha-card
				class=${layout}
				role=${tappable ? "button" : nothing}
				tabindex=${tappable ? "0" : nothing}
				aria-label=${tappable ? "Wetter" : nothing}
				@click=${this._tap}
			>
				${content}
			</ha-card>
		`;
	}

	private _renderHalf(parts: Parts): TemplateResult {
		{
			const width = this._width - PADDING * 2 - BORDERS;
			const line = parts.raining
				? html`${parts.rainText}${parts.humidityText === nothing ? nothing : html`${parts.dot}${parts.humidityText}`}`
				: html`${parts.humidityText}${parts.range ? html`${parts.dot}↑${Math.round(parts.range.high)}° ↓${Math.round(parts.range.low)}°` : nothing}`;
			return html`
				<div class="half">
					<div class="top">
						<div class="temperature">${parts.temperatureText}</div>
						${parts.condition ? weatherIcon(parts.condition, parts.night, 30) : nothing}
					</div>
					<div class="line">${line}</div>
					${parts.curve ? spark(parts.curve, width, 34, { extremes: true, bottom: 0, rainBars: parts.bars }) : html`<div class="spark-placeholder"></div>`}
				</div>
			`;
		}
	}

	private _renderFull(parts: Parts): TemplateResult {
		{
			const width = Math.max(
				80,
				this._width - PADDING * 2 - BORDERS - FULL_TEXT_COLUMN - FULL_GAP,
			);
			const lead = parts.raining
				? parts.rainText
				: CONDITION_WORDS[parts.condition]
					? html`<span class="lead">${CONDITION_WORDS[parts.condition]}</span>`
					: "";
			const firstLine =
				lead && parts.humidityText !== nothing
					? html`${lead}${parts.dot}${parts.humidityText}`
					: html`${lead}${parts.humidityText}`;
			const bottomLine = parts.raining
				? parts.rainToday !== undefined
					? `${decimal(parts.rainToday, 1, parts.language)} mm heute`
					: ""
				: parts.range
					? `H ${decimal(parts.range.high, 1, parts.language)}° · T ${decimal(parts.range.low, 1, parts.language)}°`
					: "";
			return html`
				<div class="full">
					<div class="text">
						<div class="head">
							${parts.condition ? weatherIcon(parts.condition, parts.night, 40) : nothing}
							<div class="temperature">${parts.temperatureText}</div>
						</div>
						<div class="line first">${firstLine}</div>
						<div class="line">${bottomLine}</div>
					</div>
					${
						parts.curve
							? spark(parts.curve, width, 72, {
									extremes: false,
									bottom: 14,
									rainBars: parts.bars,
									labels: [
										{ index: 0, text: "24 h" },
										{ index: parts.curve.length - 1, text: "jetzt" },
									],
								})
							: nothing
					}
				</div>
			`;
		}
	}

	static override styles = [
		sparkStyles,
		weatherIconStyles,
		css`
		:host {
			--_orange: #ff9500;
			--_curve: var(--_orange);
			--_curve-fill: rgba(255, 149, 0, 0.28);
			--_rain-text: #1e88e5;
			--_rain-bar: #30b3ff;
			display: block;
			/* Fill the sections grid cell like stock cards (2 rows = 120 px) */
			height: 100%;
		}
		:host([dark]) {
			--_orange: #ff9f0a;
			--_rain-text: #4fb4ff;
			--_curve-fill: rgba(255, 159, 10, 0.28);
		}
		ha-card {
			display: block;
			box-sizing: border-box;
			height: 100%;
			min-height: 120px;
			padding: 12px;
			border: 1px solid var(--ha-card-border-color, rgba(60, 60, 67, 0.1));
			overflow: hidden;
			-webkit-tap-highlight-color: transparent;
		}
		ha-card[role="button"] {
			cursor: pointer;
		}
		ha-card:focus-visible {
			outline: 2px solid var(--accent-color, var(--primary-color));
			outline-offset: 2px;
		}
		.half {
			display: flex;
			flex-direction: column;
			height: 100%;
		}
		.top {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			gap: 6px;
		}
		.temperature {
			font-size: 32px;
			line-height: 36px;
			font-weight: var(--ha-font-weight-medium, 500);
			letter-spacing: -0.02em;
			white-space: nowrap;
			color: var(--primary-text-color);
		}
		.line {
			font-size: 12px;
			line-height: 16px;
			color: var(--secondary-text-color);
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			display: flex;
			align-items: center;
			gap: 3px;
			--mdc-icon-size: 13px;
		}
		.line b {
			font-weight: var(--ha-font-weight-bold, 700);
			color: var(--_rain-text);
		}
		.line .rain {
			color: var(--_rain-text);
		}
		.dot {
			opacity: 0.6;
		}
		.spark,
		.spark-placeholder {
			margin-top: auto;
		}
		.spark-placeholder {
			height: 34px;
		}
		.full {
			display: grid;
			grid-template-columns: ${FULL_TEXT_COLUMN}px minmax(0, 1fr);
			gap: ${FULL_GAP}px;
			height: 96px;
			align-items: stretch;
		}
		/* Text block centred in the 96 px row */
		.full .text {
			min-width: 0;
			display: flex;
			flex-direction: column;
			justify-content: center;
		}
		.full .head {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-left: -2px;
		}
		.full .first {
			margin-top: 6px;
		}
		/* Only the condition word (or the rain rate) gives way; the humidity and its "%" stay whole */
		.full .first > * {
			flex: none;
		}
		.full .first > .lead,
		.full .first > b {
			flex: 0 1 auto;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.full .dot {
			margin: 0 2px;
		}
		/* MDI's drop sits small in its box */
		.line .drop {
			--mdc-icon-size: 15px;
		}
		/* The chart sits at the bottom of the 96 px row, its labels level with the last text line */
		.full .spark {
			margin-top: 0;
			align-self: end;
		}
	`,
	];
}

interface Parts {
	temperatureText: string;
	condition: string;
	night: boolean;
	raining: boolean;
	rainText: TemplateResult;
	humidityText: TemplateResult | typeof nothing;
	dot: TemplateResult;
	range?: { low: number; high: number };
	curve?: number[];
	bars: [number, number][];
	language: string;
	rainToday?: number;
}

registerCard("weather-summary-card", WeatherSummaryCard, {
	name: "Wetter-Übersicht",
	description:
		"Temperatur, Luftfeuchte, Höchst-/Tiefstwert heute und 24-h-Verlauf; Regen nur, wenn es regnet",
	preview: true,
});
