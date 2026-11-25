import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { fireHassAction } from "../../ha/actions";
import { entitiesChanged } from "../../ha/entities";
import { languageOf, numericState } from "../../ha/format";
import { registerCard } from "../../ha/register";
import { reflectDarkMode } from "../../ha/theme";
import type { HomeAssistant, LovelaceCardConfig } from "../../ha/types";
import { weatherIcon, weatherIconStyles } from "../weather/condition";
import { temperatureColor } from "../weather/palette";
import { type ForecastDaysConfig, normalizeConfig } from "./config";
import { type DailyForecast, dayLabel, dayRows, degrees } from "./scale";

/** Days on one shared temperature scale (`dayRows`), from HA's daily forecast. */
export class ForecastDaysCard extends LitElement {
	static override properties = {
		_config: { state: true },
		_forecast: { state: true },
		hass: { attribute: false },
	};

	declare _config?: ForecastDaysConfig;
	declare _forecast?: DailyForecast[];
	declare hass?: HomeAssistant;

	/** The entity the live subscription is for, and how to end it. */
	private _subscribed?: string;
	private _unsubscribe?: Promise<() => Promise<void>>;

	static getStubConfig(): Partial<ForecastDaysConfig> {
		return { entity: "weather.home" };
	}

	setConfig(config: LovelaceCardConfig): void {
		this._config = normalizeConfig(config);
	}

	getCardSize(): number {
		return this._config?.days ?? 7;
	}

	getGridOptions() {
		return { columns: 12, min_columns: 6 };
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this._endSubscription();
	}

	/** `hass` changes on every state change in the house; only the current temperature (and dark mode) matters. */
	protected override shouldUpdate(changed: PropertyValues<this>): boolean {
		if (changed.size === 1 && changed.has("hass")) {
			const previous = changed.get("hass") as HomeAssistant | undefined;
			const watched = this._config?.temperature
				? [this._config.temperature]
				: [];
			return (
				this._subscribed !== this._config?.entity ||
				entitiesChanged(previous, this.hass, watched)
			);
		}
		return true;
	}

	protected override willUpdate(): void {
		reflectDarkMode(this, this.hass);
	}

	/** (Re)subscribe once attached with hass, and whenever the entity changes. */
	protected override updated(): void {
		const entity = this._config?.entity;
		const connection = this.hass?.connection;
		if (
			!this.isConnected ||
			!entity ||
			!connection ||
			this._subscribed === entity
		)
			return;
		this._endSubscription();
		this._forecast = undefined;
		this._subscribed = entity;
		this._unsubscribe = connection.subscribeMessage<{
			forecast: DailyForecast[] | null;
		}>(
			(message) => {
				this._forecast = message.forecast ?? [];
			},
			{
				type: "weather/subscribe_forecast",
				forecast_type: "daily",
				entity_id: entity,
			},
		);
		this._unsubscribe.catch((error: unknown) => {
			console.warn("forecast-days-card: Vorhersage nicht abonniert", error);
		});
	}

	private _endSubscription(): void {
		this._unsubscribe
			?.then((unsubscribe) => unsubscribe())
			.catch(() => {
				// Failed subscriptions were reported when they started; nothing left to end.
			});
		this._unsubscribe = undefined;
		this._subscribed = undefined;
	}

	private _tap(): void {
		const config = this._config;
		if (config && config.tap_action.action !== "none")
			fireHassAction(this, config.tap_action, config.entity);
	}

	override render() {
		const config = this._config;
		if (!config) return nothing;
		const language = languageOf(this.hass);
		const forecast = this._forecast ?? [];
		const rows = forecast.length
			? dayRows(
					forecast,
					config.days,
					numericState(this.hass, config.temperature),
				)
			: [];
		const tappable = config.tap_action.action !== "none";
		return html`
			<ha-card
				role=${tappable ? "button" : nothing}
				tabindex=${tappable ? "0" : nothing}
				aria-label=${tappable ? "Vorhersage" : nothing}
				@click=${this._tap}
			>
				${rows.map(
					(row, index) => html`
						<div class="row">
							<span class="day">${dayLabel(row.day.datetime, index, language)}</span>
							<span class="icon">
								${row.day.condition ? weatherIcon(row.day.condition, false, 26) : nothing}
								${row.rain !== undefined ? html`<small>${Math.round(row.rain)} %</small>` : nothing}
							</span>
							<span class="low">${degrees(row.low)}</span>
							<span class="bar">
								<b style="left: ${row.left.toFixed(1)}%; right: ${row.right.toFixed(1)}%; background: linear-gradient(90deg, ${temperatureColor(row.low)}, ${temperatureColor(row.high)})"></b>
								${row.dot !== undefined ? html`<i class="dot" style="left: ${row.dot.toFixed(1)}%"></i>` : nothing}
							</span>
							<span class="high">${degrees(row.high)}</span>
						</div>
					`,
				)}
			</ha-card>
		`;
	}

	static override styles = [
		weatherIconStyles,
		css`
			:host {
				--_track: rgba(118, 118, 128, 0.16);
				--_rain-text: #1e88e5;
				display: block;
			}
			:host([dark]) {
				--_track: rgba(255, 255, 255, 0.1);
				--_rain-text: #4fb4ff;
			}
			ha-card {
				padding: 2px 14px;
				min-height: 44px;
				box-sizing: border-box;
				color: var(--primary-text-color);
			}
			ha-card[role="button"] {
				cursor: pointer;
			}
			.row {
				display: grid;
				grid-template-columns: 50px 34px 28px minmax(0, 1fr) 28px;
				align-items: center;
				gap: 8px;
				height: 44px;
				border-bottom: 1px solid var(--divider-color);
				font-size: 15px;
				white-space: nowrap;
			}
			.row:last-child {
				border-bottom: 0;
			}
			.day {
				font-weight: 500;
			}
			.icon {
				display: flex;
				flex-direction: column;
				align-items: center;
				line-height: 1;
			}
			.icon small {
				font-size: 10px;
				font-weight: 600;
				color: var(--_rain-text);
				margin-top: 1px;
			}
			.low {
				color: var(--secondary-text-color);
				text-align: right;
			}
			.high {
				text-align: right;
				font-weight: 500;
			}
			.bar {
				position: relative;
				height: 5px;
				border-radius: 3px;
				background: var(--_track);
			}
			.bar b {
				position: absolute;
				top: 0;
				bottom: 0;
				border-radius: 3px;
			}
			.dot {
				position: absolute;
				top: 50%;
				width: 9px;
				height: 9px;
				margin: -4.5px 0 0 -4.5px;
				border-radius: 50%;
				background: var(--primary-text-color);
				box-shadow: 0 0 0 2px var(--ha-card-background, var(--card-background-color, #fff));
			}
		`,
	];
}

registerCard("forecast-days-card", ForecastDaysCard, {
	name: "Forecast days",
	description:
		"Daily forecast rows on one shared temperature scale, with the current temperature on today's bar.",
});
