import { css, html, LitElement, nothing, type PropertyValues, svg } from "lit";
import { fireHassAction } from "../../ha/actions";
import { entitiesChanged } from "../../ha/entities";
import { decimal, languageOf, numericState } from "../../ha/format";
import { registerCard } from "../../ha/register";
import { reflectDarkMode } from "../../ha/theme";
import type { HomeAssistant, LovelaceCardConfig } from "../../ha/types";
import {
	configForm,
	normalizeConfig,
	type RainConfig,
	STUB_CONFIG,
	watchedEntities,
} from "./config";
import {
	chartMax,
	DAYS,
	type DailyStat,
	dailyBars,
	dayStarts,
	fetchDaily,
	isRaining,
	lastRain,
} from "./daily";

const REFRESH_MS = 10 * 60_000;
const CHART_HEIGHT = 76;
/** Card padding 14 px on each side plus the 1 px border. */
const INSET = 2 * 14 + 2;

/**
 * The rain card: today's total or the rate while it rains, event/24 h/week/month totals, 14 daily
 * bars from the recorder and the year's total. Self-contained, so it fits on any page.
 */
export class RainCard extends LitElement {
	static override properties = {
		_config: { state: true },
		_rows: { state: true },
		_width: { state: true },
		hass: { attribute: false },
	};

	declare _config?: RainConfig;
	declare _rows?: DailyStat[];
	declare _width: number;
	declare hass?: HomeAssistant;

	private _watched: string[] = [];
	private _timer?: ReturnType<typeof setInterval>;
	private _loading = false;
	private readonly _resizeObserver = new ResizeObserver(([entry]) => {
		const width = Math.round(entry.contentRect.width);
		if (width > 0 && width !== this._width) this._width = width;
	});

	constructor() {
		super();
		this._width = 353;
	}

	static getConfigForm() {
		return configForm;
	}

	static getStubConfig(): Partial<LovelaceCardConfig> {
		return { ...STUB_CONFIG };
	}

	setConfig(config: LovelaceCardConfig): void {
		this._config = normalizeConfig(config);
		this._watched = watchedEntities(this._config);
		this._rows = undefined;
		if (this.isConnected) this._refresh();
	}

	getCardSize(): number {
		return 5;
	}

	getGridOptions() {
		return { columns: 12, rows: 4, min_columns: 6, min_rows: 4 };
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
		if (this.isConnected && this.hass && !this._rows && !this._loading)
			this._refresh();
	}

	protected override willUpdate(): void {
		reflectDarkMode(this, this.hass);
	}

	private _refresh(): void {
		const config = this._config;
		if (!config || !this.hass || this._loading) return;
		this._loading = true;
		fetchDaily(this.hass, config.today, dayStarts(new Date())[0])
			.then((rows) => {
				this._rows = rows;
			})
			.catch((error: unknown) => {
				// The values still show; only the bars and "Zuletzt" are missing.
				console.warn("rain-card: Tageswerte nicht geladen", error);
			})
			.finally(() => {
				this._loading = false;
			});
	}

	private _tap(): void {
		const config = this._config;
		if (config && config.tap_action.action !== "none")
			fireHassAction(this, config.tap_action, config.today);
	}

	override render() {
		const config = this._config;
		if (!config) return nothing;
		const language = languageOf(this.hass);
		const mm = (value: number | undefined) =>
			value === undefined ? "–" : `${decimal(value, 1, language)} mm`;
		const rate = numericState(this.hass, config.rate);
		const raining = isRaining(rate);
		const today = numericState(this.hass, config.today) ?? 0;
		const starts = dayStarts(new Date());
		const bars = this._rows ? dailyBars(this._rows, starts, today) : undefined;
		const tappable = config.tap_action.action !== "none";

		let left: unknown;
		if (raining) {
			const sensor = config.raining
				? this.hass?.states[config.raining]
				: undefined;
			const since =
				sensor?.state === "on"
					? new Date(sensor.last_changed).toLocaleTimeString(language, {
							hour: "2-digit",
							minute: "2-digit",
						})
					: undefined;
			left = html`<div class="val rain">${decimal(rate ?? 0, 1, language)}<small>mm/h</small></div>
				${since ? html`<div class="s">Regnet seit ${since}</div>` : nothing}`;
		} else {
			const last = bars ? lastRain(bars, starts) : undefined;
			const line = !bars
				? ""
				: last
					? `Zuletzt ${last.day}.: ${mm(last.amount)}`
					: `Seit ${DAYS} Tagen trocken`;
			left = html`<div class="val">${decimal(today, 1, language)}<small>mm heute</small></div>
				<div class="s">${line}</div>`;
		}

		const event = numericState(this.hass, config.event);
		const eventText = event ? mm(event) : "–";
		const year = numericState(this.hass, config.year);
		const rows: [string, unknown][] = [
			["Ereignis", raining && event ? html`<b>${eventText}</b>` : eventText],
			["24 h", mm(numericState(this.hass, config.last_24h))],
			["Woche", mm(numericState(this.hass, config.week))],
			["Monat", mm(numericState(this.hass, config.month))],
		];

		return html`
			<ha-card
				role=${tappable ? "button" : nothing}
				tabindex=${tappable ? "0" : nothing}
				aria-label=${tappable ? "Regen" : nothing}
				@click=${this._tap}
			>
				<div class="hd">
					<ha-icon icon="mdi:weather-rainy"></ha-icon>Regen
					${tappable ? html`<ha-icon class="go" icon="mdi:chevron-right"></ha-icon>` : nothing}
				</div>
				<div class="top">
					<div class="left">${left}</div>
					<div>
						${rows.map(([key, value]) => html`<div class="kv"><span>${key}</span><span>${value}</span></div>`)}
					</div>
				</div>
				${this._chart(bars, starts, language)}
				<div class="rl">
					<span>Pro Tag, ${DAYS} Tage</span>
					${year !== undefined ? html`<span>Jahr ${mm(year)}</span>` : nothing}
				</div>
			</ha-card>
		`;
	}

	/** One bar per day (2.5 px gaps, 12 px headroom, 14 px for the day labels). */
	private _chart(
		bars: number[] | undefined,
		starts: number[],
		language: string,
	) {
		const width = Math.max(100, this._width - INSET);
		const height = CHART_HEIGHT;
		if (!bars)
			return html`<svg class="chart" viewBox="0 0 ${width} ${height}"></svg>`;
		const max = chartMax(bars);
		const slot = width / bars.length;
		const y = (value: number) =>
			12 + (height - 26) * (1 - Math.min(value, max) / max);
		const last = bars.length - 1;
		const labels: [string, number][] = [
			[`${new Date(starts[0]).getDate()}.`, 0],
			[`${new Date(starts[7]).getDate()}.`, 7],
			["heute", last],
		];
		return html`<svg class="chart" viewBox="0 0 ${width} ${height}">
			${bars.map((value, index) => {
				const x = slot * index + 2.5;
				const barWidth = slot - 5;
				if (value <= 0)
					return svg`<rect class="track" x=${x} y=${y(0) - 1.5} width=${barWidth} height="1.5"></rect>`;
				return svg`<rect class="bar" x=${x} y=${y(value)} width=${barWidth} height=${y(0) - y(value)} rx="2"></rect>
					${value >= 7 ? svg`<text x=${x + barWidth / 2} y=${y(value) - 3} text-anchor="middle">${decimal(value, 1, language)}</text>` : nothing}`;
			})}
			${labels.map(
				([text, index]) =>
					svg`<text x=${slot * index + slot / 2} y=${height - 2} text-anchor=${index === last ? "end" : "middle"}>${text}</text>`,
			)}
		</svg>`;
	}

	static override styles = css`
		:host {
			--_rain-text: #1e88e5;
			--_rain-bar: #30b3ff;
			--_track: rgba(118, 118, 128, 0.16);
			--_hair: rgba(60, 60, 67, 0.14);
			display: block;
			height: 100%;
		}
		:host([dark]) {
			--_rain-text: #4fb4ff;
			--_track: rgba(255, 255, 255, 0.1);
			--_hair: rgba(255, 255, 255, 0.08);
		}
		ha-card {
			display: flex;
			flex-direction: column;
			gap: 4px;
			box-sizing: border-box;
			height: 100%;
			padding: 12px 14px;
			overflow: hidden;
			color: var(--primary-text-color);
			-webkit-tap-highlight-color: transparent;
		}
		ha-card[role="button"] {
			cursor: pointer;
		}
		ha-card:focus-visible {
			outline: 2px solid var(--accent-color, var(--primary-color));
			outline-offset: 2px;
		}
		.hd {
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
		.hd .go {
			margin-left: auto;
			--mdc-icon-size: 18px;
		}
		.top {
			display: grid;
			grid-template-columns: 128px minmax(0, 1fr);
			gap: 14px;
			align-items: start;
			margin-top: 2px;
		}
		.left {
			min-width: 0;
		}
		.val {
			font-size: 28px;
			line-height: 32px;
			font-weight: 500;
			white-space: nowrap;
		}
		.val small {
			font-size: 15px;
			font-weight: 400;
			color: var(--secondary-text-color);
			margin-left: 4px;
		}
		.val.rain {
			color: var(--_rain-text);
		}
		.s {
			font-size: 12px;
			line-height: 16px;
			color: var(--secondary-text-color);
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.kv {
			display: flex;
			justify-content: space-between;
			font-size: 13px;
			line-height: 17px;
			padding: 2px 0;
			border-bottom: 1px solid var(--_hair);
			white-space: nowrap;
		}
		.kv:last-child {
			border-bottom: 0;
		}
		.kv span:first-child {
			color: var(--secondary-text-color);
		}
		.kv b {
			font-weight: 600;
			color: var(--_rain-text);
		}
		.chart {
			display: block;
			width: 100%;
			height: ${CHART_HEIGHT}px;
			margin-top: 6px;
		}
		.chart text {
			font-size: 9.5px;
			fill: var(--secondary-text-color);
		}
		.bar {
			fill: var(--_rain-bar);
		}
		.track {
			fill: var(--_track);
		}
		.rl {
			display: flex;
			justify-content: space-between;
			font-size: 11px;
			color: var(--secondary-text-color);
			white-space: nowrap;
		}
	`;
}

registerCard("rain-card", RainCard, {
	documentation: "rain",
	name: "Regen",
	description:
		"Regen heute oder Regenrate, Ereignis/24 h/Woche/Monat, 14 Tage als Balken und Jahressumme",
	preview: true,
});
