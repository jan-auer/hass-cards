import {
	mdiArrowLeft,
	mdiDelete,
	mdiDragHorizontalVariant,
	mdiPencil,
	mdiPlus,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import type { HomeAssistant, LovelaceCardConfig } from "../../ha/types";
import { barSettingsForm, pillForm } from "./config";

type Entry = Record<string, unknown>;

const isSeparator = (entry: Entry) => entry.type === "separator";

/**
 * `filter-bar`'s editor, in the style of HA's features list: the bar's settings, then its pills and dividers
 * as a sortable list. "Hinzufügen" asks for the kind; a pill opens its own form, a divider has nothing to
 * set. Pills are written without `type` (the default), dividers as `{type: separator}`.
 */
export class FilterBarEditor extends LitElement {
	static override properties = {
		hass: { attribute: false },
		_config: { state: true },
		_editing: { state: true },
	};

	declare hass?: HomeAssistant;
	declare _config?: LovelaceCardConfig;
	/** The pill whose form is open. */
	declare _editing?: number;

	setConfig(config: LovelaceCardConfig): void {
		if (config.items !== undefined && !Array.isArray(config.items))
			throw new Error('"items" muss eine Liste sein');
		this._config = config;
	}

	private get _items(): Entry[] {
		return (this._config?.items as Entry[] | undefined) ?? [];
	}

	protected override render() {
		if (!this._config) return nothing;
		const editing =
			this._editing !== undefined ? this._items[this._editing] : undefined;
		if (editing) return this._renderPill(editing);
		return html`
			<ha-form
				.hass=${this.hass}
				.data=${this._config}
				.schema=${barSettingsForm.schema}
				.computeLabel=${barSettingsForm.computeLabel}
				.computeHelper=${barSettingsForm.computeHelper}
				@value-changed=${this._settingsChanged}
			></ha-form>
			<h3>Einträge</h3>
			<ha-sortable handle-selector=".handle" @item-moved=${this._moved}>
				<div class="entries">
					${this._items.map((entry, index) => this._renderRow(entry, index))}
				</div>
			</ha-sortable>
			<ha-dropdown @wa-select=${this._add}>
				<ha-button slot="trigger" appearance="filled" size="s">
					<ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
					Hinzufügen
				</ha-button>
				<ha-dropdown-item value="item">Eintrag</ha-dropdown-item>
				<ha-dropdown-item value="separator">Trennlinie</ha-dropdown-item>
			</ha-dropdown>
		`;
	}

	private _renderRow(entry: Entry, index: number) {
		const separator = isSeparator(entry);
		const value = String(entry.value ?? "");
		return html`<div class="entry">
			<div class="handle">
				<ha-svg-icon .path=${mdiDragHorizontalVariant}></ha-svg-icon>
			</div>
			${
				typeof entry.icon === "string" && entry.icon
					? html`<ha-icon .icon=${entry.icon}></ha-icon>`
					: nothing
			}
			<div class="label">
				${
					separator
						? html`<span class="secondary">Trennlinie</span>`
						: html`<span>${String(entry.name ?? "") || value || "Neuer Eintrag"}</span>
								${entry.name ? html`<span class="secondary">${value}</span>` : nothing}`
				}
			</div>
			${
				separator
					? nothing
					: html`<ha-icon-button
							label="Bearbeiten"
							.path=${mdiPencil}
							@click=${() => {
								this._editing = index;
							}}
						></ha-icon-button>`
			}
			<ha-icon-button
				label="Entfernen"
				.path=${mdiDelete}
				@click=${() => this._setItems(this._items.filter((_, at) => at !== index))}
			></ha-icon-button>
		</div>`;
	}

	private _renderPill(entry: Entry) {
		return html`
			<div class="back">
				<ha-icon-button
					label="Zurück"
					.path=${mdiArrowLeft}
					@click=${() => {
						this._editing = undefined;
					}}
				></ha-icon-button>
				<span>Eintrag</span>
			</div>
			<ha-form
				.hass=${this.hass}
				.data=${entry}
				.schema=${pillForm.schema}
				.computeLabel=${pillForm.computeLabel}
				.computeHelper=${pillForm.computeHelper}
				@value-changed=${this._pillChanged}
			></ha-form>
		`;
	}

	private _settingsChanged(event: CustomEvent<{ value: LovelaceCardConfig }>) {
		event.stopPropagation();
		this._fire(event.detail.value);
	}

	private _pillChanged(event: CustomEvent<{ value: Entry }>) {
		event.stopPropagation();
		const at = this._editing;
		if (at === undefined) return;
		// A pill is the default kind: no `type` in the config.
		const { type: _type, ...pill } = event.detail.value;
		this._setItems(
			this._items.map((entry, index) => (index === at ? pill : entry)),
		);
	}

	private _add(event: CustomEvent<{ item: { value: string } }>) {
		const separator = event.detail.item.value === "separator";
		const items = [...this._items, separator ? { type: "separator" } : {}];
		this._setItems(items);
		if (!separator) this._editing = items.length - 1;
	}

	private _moved(event: CustomEvent<{ oldIndex: number; newIndex: number }>) {
		event.stopPropagation();
		const { oldIndex, newIndex } = event.detail;
		const items = [...this._items];
		items.splice(newIndex, 0, ...items.splice(oldIndex, 1));
		this._setItems(items);
	}

	private _setItems(items: Entry[]) {
		if (this._config) this._fire({ ...this._config, items });
	}

	private _fire(config: LovelaceCardConfig) {
		this._config = config;
		this.dispatchEvent(
			new CustomEvent("config-changed", {
				detail: { config },
				bubbles: true,
				composed: true,
			}),
		);
	}

	static override styles = css`
		h3 {
			margin: var(--ha-space-6, 24px) 0 var(--ha-space-2, 8px);
			font-size: var(--ha-font-size-l, 16px);
			font-weight: var(--ha-font-weight-medium, 500);
		}
		.entry {
			display: flex;
			align-items: center;
			gap: var(--ha-space-2, 8px);
			min-height: var(--ha-space-12, 48px);
		}
		.handle {
			cursor: grab;
			color: var(--secondary-text-color);
		}
		.handle > * {
			pointer-events: none;
		}
		.label {
			display: flex;
			flex-direction: column;
			flex: 1;
			min-width: 0;
		}
		.secondary {
			font-size: var(--ha-font-size-s, 12px);
			color: var(--secondary-text-color);
		}
		ha-icon-button {
			--ha-icon-button-size: var(--ha-space-9, 36px);
			color: var(--secondary-text-color);
		}
		ha-dropdown {
			display: inline-block;
			margin-top: var(--ha-space-2, 8px);
		}
		.back {
			display: flex;
			align-items: center;
			gap: var(--ha-space-2, 8px);
			margin-bottom: var(--ha-space-4, 16px);
			font-size: var(--ha-font-size-l, 16px);
		}
	`;
}

if (!customElements.get("filter-bar-editor"))
	customElements.define("filter-bar-editor", FilterBarEditor);
