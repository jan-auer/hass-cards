import {
	StockBasedEditor,
	type StockEditorElement,
} from "../../ha/stock-editor";
import type { LovelaceCardConfig } from "../../ha/types";

type FormField = { name: string };

const LABELS: Record<string, string> = {
	group: "Gruppe",
	show_for: "Zeigen für",
};

const HELPERS: Record<string, string> = {
	group: "Dieselbe Gruppe wie die Filterleiste der Seite.",
	show_for: "Die Werte der Filterleiste, bei denen die Karten zu sehen sind.",
};

const ownForm = {
	schema: [
		{ name: "group", required: true, selector: { text: {} } },
		{ name: "show_for", selector: { text: { multiple: true } } },
	],
	computeLabel: (field: FormField) => LABELS[field.name],
	computeHelper: (field: FormField) => HELPERS[field.name],
};

/** The stack editor's title field: a filter section has no title. */
const HIDE_TITLE = new CSSStyleSheet();
HIDE_TITLE.replaceSync(":host > ha-form { display: none; }");

/** filter-section's editor: group and values, then HA's own stack editor for the cards (with the card picker). */
export class FilterSectionEditor extends StockBasedEditor {
	protected readonly ownForm = ownForm;

	protected toStock(config: LovelaceCardConfig): LovelaceCardConfig {
		const cards = Array.isArray(config.cards) ? config.cards : [];
		return { type: "vertical-stack", cards };
	}

	protected fromStock(
		stock: LovelaceCardConfig,
		config: LovelaceCardConfig,
	): LovelaceCardConfig {
		return { ...config, cards: stock.cards };
	}

	protected override adaptStockEditor(editor: StockEditorElement): void {
		const root = editor.shadowRoot;
		if (root && !root.adoptedStyleSheets.includes(HIDE_TITLE))
			root.adoptedStyleSheets = [...root.adoptedStyleSheets, HIDE_TITLE];
	}
}

if (!customElements.get("filter-section-editor"))
	customElements.define("filter-section-editor", FilterSectionEditor);
