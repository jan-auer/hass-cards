import { css, html, LitElement, type PropertyValues } from "lit";
import type { HomeAssistant, LovelaceCardConfig } from "./types";

/**
 * FRAGILE: HA's own card editors are internal elements, not a documented API. Two of our cards extend a
 * stock card and reuse its editor below their own options: room-tile-card the area card's
 * (`hui-area-card-editor`: area, sensors, alerts, features, actions), filter-section the vertical stack's
 * (`hui-stack-card-editor`: the card list with HA's card picker). Frontend 20261028.6:
 * src/panels/lovelace/editor/config-elements/hui-{area,stack}-card-editor.ts.
 *
 * What we rely on: a stock card class's static `getConfigElement()` resolves to its editor; the editor
 * takes `hass`, `lovelace` and `setConfig()`, and fires `config-changed` with the whole stock config.
 * If an editor stops loading after an HA update, the card falls back to HA's YAML editor with the error.
 */
export interface StockEditorElement extends HTMLElement {
	hass?: HomeAssistant;
	lovelace?: unknown;
	setConfig(config: LovelaceCardConfig): void;
}

interface StockCardClass {
	getConfigElement?(): StockEditorElement | Promise<StockEditorElement>;
}

/**
 * The editor of a stock card. Creating the card through the documented card helpers loads its module,
 * which defines `hui-<type>-card`.
 */
export async function loadStockEditor(
	stockCard: LovelaceCardConfig,
): Promise<StockEditorElement> {
	const helpers = await window.loadCardHelpers?.();
	if (!helpers) throw new Error("loadCardHelpers ist nicht verfügbar");
	helpers.createCardElement(stockCard);
	const tag = `hui-${stockCard.type}-card`;
	await customElements.whenDefined(tag);
	const editor = await (
		customElements.get(tag) as unknown as StockCardClass
	).getConfigElement?.();
	if (!editor) throw new Error(`${tag} hat keinen Editor`);
	return editor;
}

/** An `ha-form` schema with labels and helpers, rendered by HA's own form element. */
export interface OwnOptionsForm {
	schema: readonly unknown[];
	computeLabel(field: { name: string }): string | undefined;
	computeHelper?(field: { name: string }): string | undefined;
}

/**
 * The editor of a card built on a stock card: our own options in HA's form on top, the stock card's editor
 * below. Subclasses say how a config splits into the stock part and back.
 */
export abstract class StockBasedEditor extends LitElement {
	static override properties = {
		_config: { state: true },
		_stockEditor: { state: true },
		_error: { state: true },
	};

	declare _config?: LovelaceCardConfig;
	declare _stockEditor?: StockEditorElement;
	declare _error?: string;

	private _hass?: HomeAssistant;
	private _lovelace?: unknown;

	/** Our options' form; it edits the full config, HA keeps keys it doesn't show. */
	protected abstract readonly ownForm: OwnOptionsForm;
	/** The stock card config the stock editor edits. */
	protected abstract toStock(config: LovelaceCardConfig): LovelaceCardConfig;
	/** Our config after the stock editor changed its part. */
	protected abstract fromStock(
		stock: LovelaceCardConfig,
		config: LovelaceCardConfig,
	): LovelaceCardConfig;
	/** Adjust the stock editor once it's rendered (optional). */
	protected adaptStockEditor(_editor: StockEditorElement): void {}

	set hass(hass: HomeAssistant | undefined) {
		this._hass = hass;
		if (this._stockEditor) this._stockEditor.hass = hass;
		this.requestUpdate();
	}

	get hass(): HomeAssistant | undefined {
		return this._hass;
	}

	/** HA's editor hands the dashboard config to editors that have this property (the card picker needs it). */
	set lovelace(lovelace: unknown) {
		this._lovelace = lovelace;
		if (this._stockEditor) this._stockEditor.lovelace = lovelace;
	}

	get lovelace(): unknown {
		return this._lovelace;
	}

	/** Throws for configs the stock editor rejects, so HA offers the YAML editor instead. */
	setConfig(config: LovelaceCardConfig): void {
		this._config = config;
		if (this._stockEditor) this._stockEditor.setConfig(this.toStock(config));
		else this._loadStockEditor();
	}

	private _loading = false;

	/** Loads once, on the first config (HA sets it after the element first renders). */
	private _loadStockEditor(): void {
		if (this._loading || !this._config) return;
		this._loading = true;
		loadStockEditor(this.toStock(this._config)).then(
			(editor) => {
				editor.hass = this._hass;
				editor.lovelace = this._lovelace;
				if (this._config) editor.setConfig(this.toStock(this._config));
				editor.addEventListener("config-changed", (event) => {
					event.stopPropagation();
					const stock = (event as CustomEvent<{ config: LovelaceCardConfig }>)
						.detail.config;
					if (this._config) this._fire(this.fromStock(stock, this._config));
				});
				this._stockEditor = editor;
			},
			(error: Error) => {
				this._error = error.message;
			},
		);
	}

	protected override updated(changed: PropertyValues): void {
		if (changed.has("_stockEditor") && this._stockEditor) {
			const editor = this._stockEditor;
			customElements
				.whenDefined(editor.localName)
				.then(() => (editor as unknown as LitElement).updateComplete)
				.then(() => this.adaptStockEditor(editor));
		}
	}

	protected override render() {
		if (!this._config) return html``;
		return html`
			<ha-form
				.hass=${this._hass}
				.data=${this._config}
				.schema=${this.ownForm.schema}
				.computeLabel=${this.ownForm.computeLabel}
				.computeHelper=${this.ownForm.computeHelper}
				@value-changed=${this._ownChanged}
			></ha-form>
			${this._error ? html`<p class="error">${this._error}</p>` : this._stockEditor}
		`;
	}

	static override styles = css`
		ha-form {
			display: block;
			margin-bottom: var(--ha-space-6, 24px);
		}
		.error {
			color: var(--error-color);
		}
	`;

	private _ownChanged(event: CustomEvent<{ value: LovelaceCardConfig }>): void {
		event.stopPropagation();
		this._fire(event.detail.value);
	}

	private _fire(config: LovelaceCardConfig): void {
		this._config = config;
		this.dispatchEvent(
			new CustomEvent("config-changed", {
				detail: { config },
				bubbles: true,
				composed: true,
			}),
		);
	}
}
