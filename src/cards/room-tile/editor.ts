import { StockBasedEditor } from "../../ha/stock-editor";
import type { LovelaceCardConfig } from "../../ha/types";
import { OWN_KEYS } from "./config";

type FormField = { name: string };

const LABELS: Record<string, string> = {
	identity: "Darstellung des Raums",
	highlight: "Hervorheben, wenn aktiv",
	highlight_entities: "Aktiv, wenn eine davon an ist",
	image: "Foto",
};

const HELPERS: Record<string, string> = {
	image: "Leer: das Bild des Bereichs.",
};

const ownForm = {
	schema: [
		{
			type: "grid",
			name: "",
			schema: [
				{
					name: "identity",
					selector: {
						select: {
							mode: "dropdown",
							options: [
								{ value: "none", label: "Wie die Bereichskarte" },
								{ value: "photo", label: "Foto statt Symbol" },
								{ value: "photo-large", label: "Großes Foto" },
								{ value: "strip", label: "Farbstreifen" },
							],
						},
					},
				},
				{
					name: "highlight",
					selector: {
						select: {
							mode: "dropdown",
							options: [
								{ value: "none", label: "Nicht" },
								{ value: "room", label: "In der Raumfarbe" },
								{ value: "warm", label: "Warm" },
								{ value: "neutral", label: "Neutral" },
							],
						},
					},
				},
			],
		},
		{
			name: "highlight_entities",
			selector: { entity: { multiple: true } },
		},
		{ name: "image", selector: { text: {} } },
	],
	computeLabel: (field: FormField) => LABELS[field.name],
	computeHelper: (field: FormField) => HELPERS[field.name],
};

/** room-tile-card's editor: our options, then HA's own area card editor (area, sensors, features, actions). */
export class RoomTileCardEditor extends StockBasedEditor {
	protected readonly ownForm = ownForm;

	protected toStock(config: LovelaceCardConfig): LovelaceCardConfig {
		const stock = Object.fromEntries(
			Object.entries(config).filter(([key]) => !OWN_KEYS.includes(key)),
		);
		return { ...stock, type: "area" };
	}

	protected fromStock(
		stock: LovelaceCardConfig,
		config: LovelaceCardConfig,
	): LovelaceCardConfig {
		const own = Object.fromEntries(
			Object.entries(config).filter(([key]) => OWN_KEYS.includes(key)),
		);
		return { ...stock, ...own, type: config.type };
	}
}

if (!customElements.get("room-tile-card-editor"))
	customElements.define("room-tile-card-editor", RoomTileCardEditor);
