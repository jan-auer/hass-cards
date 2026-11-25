import { css, html, LitElement, nothing } from "lit";
import { fireHassAction } from "../../ha/actions";
import { entitiesChanged } from "../../ha/entities";
import { languageOf, numericState } from "../../ha/format";
import { registerCard } from "../../ha/register";
import type { HomeAssistant, LovelaceCardConfig } from "../../ha/types";
import {
	activeLevel,
	bandGradient,
	dotPosition,
	type LevelConfig,
	normalizeConfig,
	valueText,
} from "./config";

/**
 * A value on a coloured scale (UV index, air-quality index): laid out like HA's stock sensor
 * card (name and icon on top, the big value below) with the level word in the level's colour and, at the bottom, a
 * band of the levels' colours with a dot at the value. Usage examples in config.ts.
 */
export class LevelCard extends LitElement {
	static override properties = { _config: { state: true } };
	declare _config?: LevelConfig;
	private _hass?: HomeAssistant;

	static getStubConfig(hass?: HomeAssistant): Partial<LovelaceCardConfig> {
		const entity =
			Object.keys(hass?.states ?? {}).find((id) => id.includes("uv_index")) ??
			"";
		return {
			entity,
			max: 11,
			levels: [
				{ from: 0, word: "niedrig", color: "#34C759" },
				{ from: 3, word: "mäßig", color: "#FFCC00" },
				{ from: 6, word: "hoch", color: "#FF9500" },
				{ from: 8, word: "sehr hoch", color: "#FF3B30" },
				{ from: 11, word: "extrem", color: "#AF52DE" },
			],
		};
	}

	setConfig(config: LovelaceCardConfig): void {
		this._config = normalizeConfig(config);
	}

	set hass(hass: HomeAssistant | undefined) {
		const previous = this._hass;
		this._hass = hass;
		if (this._config && entitiesChanged(previous, hass, [this._config.entity]))
			this.requestUpdate();
	}

	get hass(): HomeAssistant | undefined {
		return this._hass;
	}

	getGridOptions() {
		return { columns: 12, rows: 2, min_columns: 6, min_rows: 2 };
	}

	getCardSize(): number {
		return 2;
	}

	override render() {
		const config = this._config;
		if (!config) return nothing;
		const hass = this._hass;
		const entity = hass?.states[config.entity];
		const value = numericState(hass, config.entity);
		const level = value === undefined ? undefined : activeLevel(config, value);
		// Text or HA name items both go through HA's own formatter (stock cards do the same).
		const name =
			entity && hass?.formatEntityName
				? hass.formatEntityName(entity, config.name)
				: typeof config.name === "string"
					? config.name
					: String(entity?.attributes.friendly_name ?? config.entity);
		const icon =
			config.icon ??
			(typeof entity?.attributes.icon === "string"
				? entity.attributes.icon
				: "mdi:gauge");
		const word =
			level?.word ?? (value === undefined ? undefined : config.suffix);
		return html`<ha-card
			role="button"
			tabindex="0"
			@click=${this._tap}
			@keydown=${(event: KeyboardEvent) => (event.key === "Enter" || event.key === " ") && this._tap()}
			style=${level ? `--_color: ${level.color}` : ""}
		>
			<div class="top"><span class="name">${name}</span><ha-icon icon=${icon}></ha-icon></div>
			<div class="value">
				${value === undefined ? "–" : valueText(value, languageOf(hass))}
				${word ? html`<span class="word ${level?.word ? "" : "neutral"}">${word}</span>` : nothing}
			</div>
			<div class="scale">
				<div class="band" style="background: ${bandGradient(config)}">
					${value === undefined ? nothing : html`<i style="left: ${dotPosition(config, value) * 100}%"></i>`}
				</div>
				<div class="labels"><span>${config.ends[0]}</span><span class="note">${config.note ?? ""}</span><span>${config.ends[1]}</span></div>
			</div>
		</ha-card>`;
	}

	private _tap(): void {
		if (this._config && this._config.tap_action.action !== "none")
			fireHassAction(this, this._config.tap_action, this._config.entity);
	}

	static override styles = css`
		:host {
			display: block;
			height: 100%;
		}
		ha-card {
			box-sizing: border-box;
			height: 100%;
			min-height: 120px;
			display: flex;
			flex-direction: column;
			padding-bottom: 12px;
			cursor: pointer;
		}
		/* The stock sensor card's header: 48 px, name 16 px / 500 secondary, 24 px icon 16 px from the right */
		.top {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 8px 16px 0;
			height: 48px;
			box-sizing: border-box;
			line-height: 40px;
			font-size: var(--ha-font-size-l, 16px);
			font-weight: var(--ha-font-weight-medium, 500);
			color: var(--secondary-text-color);
		}
		.name {
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		ha-icon {
			flex: none;
			--mdc-icon-size: 24px;
			color: var(--_color, var(--state-icon-color));
		}
		.value {
			display: flex;
			align-items: baseline;
			gap: 6px;
			padding: 0 16px;
			font-size: var(--ha-font-size-3xl, 28px);
			font-weight: 400;
			line-height: 28px;
			margin-bottom: 8px;
			color: var(--primary-text-color);
			white-space: nowrap;
		}
		.word {
			font-size: 14px;
			font-weight: 600;
			color: var(--_color, var(--secondary-text-color));
		}
		.word.neutral {
			font-weight: 400;
			color: var(--secondary-text-color);
		}
		.scale {
			margin-top: auto;
			padding: 0 16px;
		}
		.band {
			position: relative;
			height: 6px;
			border-radius: 3px;
		}
		.band i {
			position: absolute;
			top: 50%;
			width: 12px;
			height: 12px;
			margin: -6px 0 0 -6px;
			border-radius: 50%;
			background: var(--primary-text-color);
			box-shadow: 0 0 0 2px var(--card-background-color, var(--ha-card-background));
		}
		.labels {
			display: flex;
			justify-content: space-between;
			margin-top: 4px;
			font-size: 12px;
			line-height: 14px;
			color: var(--secondary-text-color);
			white-space: nowrap;
		}
		.note {
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			padding: 0 8px;
		}
	`;
}

registerCard("level-card", LevelCard, {
	documentation: "level",
	name: "Stufen-Karte",
	description:
		"Wert mit Stufenwort und Farbband (UV-Index, Luftqualitätsindex), im Stil der Sensor-Karte",
	preview: true,
});
