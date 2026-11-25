import type { CustomCardEntry, CustomCardFeatureEntry } from "./types";

const README_URL = "https://github.com/jan-auer/hass-cards";

/** Custom element names need a hyphen; new elements carry no brand prefix. */
export type ElementName = `${string}-${string}`;

/**
 * Define a card element and list it in HA's card picker. Idempotent: loading the bundle twice
 * (a stale cache next to a new resource URL) must not throw from `customElements.define`.
 */
export function registerCard(
	tag: ElementName,
	element: CustomElementConstructor,
	{
		documentation,
		...picker
	}: Omit<CustomCardEntry, "type" | "documentationURL"> & {
		/** The card's section in the README (its heading's anchor), the editor's help link. */
		documentation: string;
	},
): void {
	if (!customElements.get(tag)) customElements.define(tag, element);

	window.customCards ??= [];
	const cards = window.customCards;
	if (cards.some((card) => card.type === tag)) return;
	cards.push({
		...picker,
		type: tag,
		documentationURL: `${README_URL}#${documentation}`,
	});
}

/**
 * Define a card feature element and list it in HA's feature picker (`window.customCardFeatures`, the
 * documented route). In a card's `features:` it's `type: custom:<tag>`. Idempotent like `registerCard`.
 */
export function registerCardFeature(
	tag: ElementName,
	element: CustomElementConstructor,
	picker: Omit<CustomCardFeatureEntry, "type">,
): void {
	if (!customElements.get(tag)) customElements.define(tag, element);

	window.customCardFeatures ??= [];
	const features = window.customCardFeatures;
	if (features.some((feature) => feature.type === tag)) return;
	features.push({ ...picker, type: tag });
}
