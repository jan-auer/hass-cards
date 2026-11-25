import { css, html, LitElement, nothing } from "lit";
import { registerCard } from "../../ha/register";
import type { HomeAssistant, LovelaceCardConfig } from "../../ha/types";
import {
	type FilterBarConfig,
	type FilterItem,
	parseBarConfig,
} from "./config";
import { filterStore } from "./store";

/**
 * A row of filter pills. Tapping one selects its value for the bar's `group`; the `filter-section` cards
 * of that group show or hide their cards. With no pill selected the group has the bar's `default` value:
 * "all" is implicit rather than a pill, and tapping the selected pill again goes back to it. The selection
 * lives in memory only and starts at the default on every visit to the page (see `store.ts`).
 *
 *   header:
 *     layout: start
 *     card:
 *       type: custom:filter-bar
 *       group: raeume
 *       items:
 *         - { name: Alle, value: alle }
 *         - { type: separator }
 *         - { name: EG, value: eg }
 *
 * HA's view header takes any card in `header.card` (frontend 20261028.6: hui-view-header.ts creates a
 * plain `hui-card`), so the bar sits there; it works in a section as well.
 */
export class FilterBar extends LitElement {
	static override properties = {
		_config: { state: true },
	};

	declare _config?: FilterBarConfig;

	/** Not reactive: the pills show no entity state, so `hass` updates never re-render the bar. */
	hass?: HomeAssistant;

	private _unsubscribe?: () => void;

	static getStubConfig(): Partial<LovelaceCardConfig> {
		return {
			group: "filter",
			default: "alle",
			items: [
				{ name: "EG", value: "eg" },
				{ name: "OG", value: "og" },
			],
		};
	}

	setConfig(config: LovelaceCardConfig): void {
		this._config = parseBarConfig(config);
		filterStore.setDefault(this._config.group, this._config.default);
		if (this.isConnected) this._subscribe();
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this._subscribe();
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this._unsubscribe?.();
		this._unsubscribe = undefined;
	}

	private _subscribe(): void {
		this._unsubscribe?.();
		this._unsubscribe = this._config
			? filterStore.subscribe(this._config.group, () => this.requestUpdate())
			: undefined;
		// A reset while the view was away (HA keeps it cached) must show on return.
		this.requestUpdate();
	}

	getCardSize(): number {
		return 1;
	}

	getGridOptions() {
		return { columns: "full", rows: "auto" } as const;
	}

	private _select(item: FilterItem): void {
		if (!this._config) return;
		const { group } = this._config;
		if (
			filterStore.isSelected(group) &&
			filterStore.value(group) === item.value
		)
			filterStore.clear(group);
		else filterStore.select(group, item.value);
	}

	override render() {
		const config = this._config;
		if (!config) return nothing;
		const selected = filterStore.isSelected(config.group)
			? filterStore.value(config.group)
			: undefined;
		return html`<div class="bar" role="group">
			${config.entries.map((entry) =>
				entry.type === "separator"
					? html`<span class="separator" role="separator" aria-orientation="vertical"></span>`
					: html`<button
							type="button"
							class="pill"
							aria-pressed=${entry.value === selected ? "true" : "false"}
							@click=${() => this._select(entry)}
						>
							${entry.icon ? html`<ha-icon icon=${entry.icon}></ha-icon>` : nothing}
							<span>${entry.name}</span>
						</button>`,
			)}
		</div>`;
	}

	/**
	 * The pills look like HA's own badges (frontend 20261028.6: src/components/ha-badge.ts): badge size,
	 * the card surface and border, medium type. Selected: inverted (text colour as
	 * fill, page background as text).
	 */
	static override styles = css`
		:host {
			display: block;
		}
		.bar {
			display: flex;
			align-items: center;
			justify-content: flex-start;
			gap: var(--ha-space-2, 8px);
			overflow-x: auto;
			overscroll-behavior-x: contain;
			scrollbar-width: none;
			/* Room for the focus ring, which overflow would clip */
			padding: 2px;
			margin: -2px;
		}
		.bar::-webkit-scrollbar {
			display: none;
		}
		.pill {
			flex: none;
			display: inline-flex;
			align-items: center;
			gap: var(--ha-space-2, 8px);
			box-sizing: border-box;
			height: var(--ha-badge-size, 36px);
			min-width: var(--ha-badge-size, 36px);
			margin: 0;
			padding: 0 12px;
			border-radius: var(--ha-badge-border-radius, calc(var(--ha-badge-size, 36px) / 2));
			background: var(--ha-card-background, var(--card-background-color, white));
			backdrop-filter: var(--ha-card-backdrop-filter, none);
			border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
			box-shadow: var(--ha-card-box-shadow, none);
			color: var(--secondary-text-color);
			font-family: inherit;
			font-size: var(--ha-badge-font-size, var(--ha-font-size-s, 12px));
			font-weight: var(--ha-font-weight-medium, 500);
			line-height: var(--ha-line-height-condensed, 1.2);
			letter-spacing: 0.1px;
			white-space: nowrap;
			cursor: pointer;
			-webkit-tap-highlight-color: transparent;
			transition:
				background-color 180ms ease-in-out,
				color 180ms ease-in-out;
		}
		.pill:focus {
			outline: none;
		}
		.pill:focus-visible {
			box-shadow:
				var(--ha-card-box-shadow, 0 0 0 0 transparent),
				0 0 0 2px var(--primary-color);
		}
		.pill[aria-pressed="true"] {
			background: var(--primary-text-color);
			border-color: transparent;
			color: var(--primary-background-color, white);
			font-weight: var(--ha-font-weight-bold, 700);
		}
		.pill ha-icon {
			--mdc-icon-size: var(--ha-badge-icon-size, 18px);
			margin-inline-start: -4px;
			line-height: 0;
		}
		.separator {
			flex: none;
			width: 1px;
			height: 22px;
			background: var(--divider-color, rgba(127, 127, 135, 0.35));
		}
	`;
}

registerCard("filter-bar", FilterBar, {
	documentation: "filter",
	name: "Filterleiste",
	description:
		"Filter-Pillen für eine Seite; blendet die filter-section-Karten derselben Gruppe ein und aus. ohne Auswahl gilt der Standardwert (default); Auswahl nur im Speicher, bei jedem Besuch wieder zurückgesetzt",
	preview: false,
});
