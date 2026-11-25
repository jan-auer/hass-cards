import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { fireHassAction } from "../../ha/actions";
import { entitiesChanged } from "../../ha/entities";
import { registerCard } from "../../ha/register";
import type { HomeAssistant, LovelaceCardConfig } from "../../ha/types";
import {
	configForm,
	normalizeConfig,
	STUB_ENTITY,
	type UpcomingPickupsConfig,
} from "./config";
import { pickupRows } from "./pickups";

/**
 * A waste-collection card (6×2): the next pickups as icon + "Heute"/"Morgen"/"in N Tagen",
 * spread evenly over the card; "✓ Rausgestellt" once the reminder is dismissed. Re-renders at local midnight,
 * when the day counts change without a state change.
 */
export class UpcomingPickupsCard extends LitElement {
	static override properties = {
		_config: { state: true },
		_day: { state: true },
		hass: { attribute: false },
	};

	declare _config?: UpcomingPickupsConfig;
	/** Today's local date; changing it at midnight re-renders. */
	declare _day: string;
	declare hass?: HomeAssistant;

	private _midnight?: ReturnType<typeof setTimeout>;

	constructor() {
		super();
		this._day = new Date().toDateString();
	}

	static getConfigForm() {
		return configForm;
	}

	static getStubConfig(): Partial<LovelaceCardConfig> {
		return { entity: STUB_ENTITY };
	}

	setConfig(config: LovelaceCardConfig): void {
		this._config = normalizeConfig(config);
	}

	getCardSize(): number {
		return 2;
	}

	getGridOptions() {
		return { columns: 6, rows: 2, min_columns: 6, min_rows: 2 };
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this._scheduleMidnight();
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		clearTimeout(this._midnight);
	}

	private _scheduleMidnight(): void {
		clearTimeout(this._midnight);
		const now = new Date();
		const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
		this._midnight = setTimeout(
			() => {
				this._day = new Date().toDateString();
				this._scheduleMidnight();
			},
			next.getTime() - now.getTime() + 1000,
		);
	}

	/** `hass` changes on every state change in the house; only this card's entity matters. */
	protected override shouldUpdate(changed: PropertyValues<this>): boolean {
		if (changed.size === 1 && changed.has("hass") && this._config) {
			const previous = changed.get("hass") as HomeAssistant | undefined;
			return entitiesChanged(previous, this.hass, [this._config.entity]);
		}
		return true;
	}

	private _tap(): void {
		const config = this._config;
		if (config && config.tap_action.action !== "none")
			fireHassAction(this, config.tap_action, config.entity);
	}

	private _key(event: KeyboardEvent): void {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		this._tap();
	}

	override render() {
		const config = this._config;
		if (!config) return nothing;
		const entity = this.hass?.states[config.entity];
		const rows = pickupRows(
			entity?.attributes.termine,
			entity?.attributes.erledigt === true,
			config,
			new Date(),
		);
		const tappable = config.tap_action.action !== "none";
		return html`<ha-card
			role=${tappable ? "button" : nothing}
			tabindex=${tappable ? "0" : nothing}
			aria-label=${tappable ? "Müllabfuhr" : nothing}
			@click=${this._tap}
			@keydown=${this._key}
		>
			${
				rows.length
					? rows.map(
							(row) =>
								html`<div class="row">
									<ha-icon icon=${row.icon} style="color: ${row.color}"></ha-icon>
									<span class=${row.bold ? "bold" : ""}>${row.text}</span>
								</div>`,
						)
					: html`<div class="row empty">Keine Termine</div>`
			}
		</ha-card>`;
	}

	static override styles = css`
		:host {
			display: block;
			height: 100%;
		}
		ha-card {
			display: flex;
			flex-direction: column;
			justify-content: space-evenly;
			box-sizing: border-box;
			height: 100%;
			padding: 12px 16px;
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
		.row {
			display: flex;
			align-items: center;
			gap: 10px;
			min-width: 0;
			font-size: 14px;
			line-height: 20px;
			white-space: nowrap;
			--mdc-icon-size: 24px;
		}
		.row span {
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.bold {
			font-weight: 600;
		}
		.empty {
			color: var(--secondary-text-color);
		}
	`;
}

registerCard("upcoming-pickups-card", UpcomingPickupsCard, {
	documentation: "waste-pickups",
	name: "Müllabfuhr",
	description:
		"Die nächsten Abholtermine je Tonne: Heute, Morgen oder in N Tagen; ✓ Rausgestellt nach dem Bestätigen",
	preview: true,
});
