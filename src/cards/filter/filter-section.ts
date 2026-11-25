import { css, html, LitElement, nothing } from "lit";
import { registerCard } from "../../ha/register";
import type {
	CardHelpers,
	HomeAssistant,
	LovelaceCardConfig,
	LovelaceCardElement,
} from "../../ha/types";
import { type FilterSectionConfig, parseSectionConfig } from "./config";
import {
	cardGridSize,
	type GridOptions,
	sectionGridStyles,
} from "./section-grid";
import "./section-editor";
import { filterStore } from "./store";

/** A card HA's helpers create; the grid hints are optional, as in HA's own sections. */
interface ChildCard extends LovelaceCardElement {
	layout?: string;
	getGridOptions?(): GridOptions | undefined;
	getCardSize?(): number | Promise<number>;
}

interface Child {
	config: LovelaceCardConfig;
	element: ChildCard;
}

/**
 * The only card of an HA section, holding that section's cards. It shows them in the
 * section's 12-column grid while the value selected in the `filter-bar` of its `group` is in `show_for`,
 * and otherwise renders nothing and hides itself, so HA hides the whole section.
 *
 *   type: custom:filter-section
 *   group: raeume
 *   show_for: [alle, eg]
 *   cards: [...]
 *
 * Hiding uses the stock conditional card's mechanism (frontend 20261028.6: hui-conditional-card.ts):
 * the `hidden` attribute plus a `card-visibility-changed` event. HA's card wrapper then hides its cell
 * (hui-card.ts `_updateVisibility`), and a section whose cards are all hidden hides itself
 * (hui-section.ts `_updateVisibility`), which drops it from the view's grid
 * (hui-sections-view.ts `.section:has(hui-section[hidden])`). Like a stock section, the wrapper also
 * hides when all its own cards are hidden (e.g. conditional cards). `connectedWhileHidden` keeps it
 * connected while hidden, so it hears the next selection.
 *
 * Children are created with the documented `loadCardHelpers().createCardElement`. Unlike in a stock
 * section, a child's own `visibility:` conditions aren't evaluated (that's HA's internal card wrapper);
 * use stock `conditional` cards instead.
 */
export class FilterSection extends LitElement {
	static override properties = {
		_config: { state: true },
		_children: { state: true },
	};

	declare _config?: FilterSectionConfig;
	declare _children: Child[];

	/** Read by HA's card wrapper: stay connected while hidden (as the stock conditional card does). */
	readonly connectedWhileHidden = true;

	/** Resolves once the child cards exist (tests). */
	ready: Promise<void> = Promise.resolve();

	private _hass?: HomeAssistant;
	private _preview = false;
	private _creation = 0;
	private _unsubscribe?: () => void;

	constructor() {
		super();
		this._children = [];
	}

	static getConfigElement(): HTMLElement {
		return document.createElement("filter-section-editor");
	}

	static getStubConfig(): Partial<LovelaceCardConfig> {
		return { group: "filter", show_for: ["alle"], cards: [] };
	}

	/** Every child gets every `hass`, shown or not, so it's current the moment it shows. */
	set hass(hass: HomeAssistant | undefined) {
		this._hass = hass;
		for (const child of this._children) child.element.hass = hass;
	}

	get hass(): HomeAssistant | undefined {
		return this._hass;
	}

	/** HA's editor sets `preview`: all cards show there, as with the stock conditional card. */
	set preview(preview: boolean | undefined) {
		this._preview = preview === true;
		for (const child of this._children) child.element.preview = this._preview;
		this.requestUpdate();
	}

	get preview(): boolean {
		return this._preview;
	}

	setConfig(config: LovelaceCardConfig): void {
		this._config = parseSectionConfig(config);
		if (this.isConnected) this._subscribe();
		this.ready = this._createChildren(this._config.cards);
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

	private async _createChildren(configs: LovelaceCardConfig[]): Promise<void> {
		const creation = ++this._creation;
		const helpers = await window.loadCardHelpers?.();
		if (!helpers) throw new Error("loadCardHelpers ist nicht verfügbar");
		if (creation !== this._creation) return;
		this._children = configs.map((config) =>
			this._createChild(config, helpers),
		);
	}

	private _createChild(
		config: LovelaceCardConfig,
		helpers: CardHelpers,
	): Child {
		const element = helpers.createCardElement(config) as ChildCard;
		element.hass = this._hass;
		element.preview = this._preview;
		element.layout = "grid";
		// What HA's card wrapper does for its card (hui-card.ts `_loadElement`): follow the card's own
		// visibility, hand `hass` to a lazily loaded card once it upgrades, rebuild one whose custom
		// element was defined late.
		element.addEventListener("card-visibility-changed", (event) => {
			event.stopPropagation();
			this.requestUpdate();
		});
		element.addEventListener(
			"ll-upgrade",
			(event) => {
				event.stopPropagation();
				element.hass = this._hass;
				element.layout = "grid";
				this.requestUpdate();
			},
			{ once: true },
		);
		element.addEventListener(
			"ll-rebuild",
			(event) => {
				event.stopPropagation();
				const rebuilt = this._createChild(config, helpers);
				this._children = this._children.map((child) =>
					child.element === element ? rebuilt : child,
				);
			},
			{ once: true },
		);
		return { config, element };
	}

	/** True while the bar's value is in `show_for`; also while no bar has set a value (fail open). */
	private _selected(): boolean {
		const config = this._config;
		if (!config) return false;
		const value = filterStore.value(config.group);
		return value === undefined || config.show_for.includes(value);
	}

	/** In HA's section grid: the full width, as tall as the cards inside. */
	getGridOptions() {
		return { columns: "full", rows: "auto" } as const;
	}

	getCardSize(): number {
		const sizes = this._children.map(({ element }) => {
			const size = element.getCardSize?.();
			return typeof size === "number" ? size : 1;
		});
		return Math.max(
			1,
			sizes.reduce((sum, size) => sum + size, 0),
		);
	}

	protected override updated(): void {
		const contentHidden =
			this._children.length > 0 &&
			this._children.every(({ element }) => element.hidden);
		const visible = this._preview || (this._selected() && !contentHidden);
		if (this.hidden !== !visible) {
			this.toggleAttribute("hidden", !visible);
			this.style.setProperty("display", visible ? "" : "none");
			this.dispatchEvent(
				new CustomEvent("card-visibility-changed", {
					bubbles: true,
					composed: true,
					detail: { value: visible },
				}),
			);
		}
	}

	override render() {
		if (!this._config || !(this._preview || this._selected())) return nothing;
		return html`<div class="grid">
			${this._children.map((child) => this._cell(child))}
		</div>`;
	}

	private _cell({ config, element }: Child) {
		element.layout = "grid";
		const { columns, rows } = cardGridSize({
			...element.getGridOptions?.(),
			...(config.grid_options as GridOptions | undefined),
		});
		const classes = [
			"cell",
			typeof rows === "number" ? "fit-rows" : "",
			columns === "full" ? "full-width" : "",
			!this._preview && element.hidden ? "hidden" : "",
		];
		const style = [
			typeof columns === "number" ? `--column-size: ${columns}` : "",
			typeof rows === "number" ? `--row-size: ${rows}` : "",
		];
		return html`<div
			class=${classes.filter(Boolean).join(" ")}
			style=${style.filter(Boolean).join("; ")}
		>${element}</div>`;
	}

	static override styles = [
		sectionGridStyles,
		css`
			:host {
				display: block;
			}
			:host([hidden]) {
				display: none;
			}
		`,
	];
}

registerCard("filter-section", FilterSection, {
	documentation: "filter",
	name: "Filterabschnitt",
	description:
		"Hält die Karten eines Abschnitts und zeigt sie nur, wenn der in der filter-bar derselben Gruppe gewählte Wert in show_for steht",
	preview: false,
});
