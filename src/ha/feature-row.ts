import type { LovelaceCardConfig } from "./types";

/**
 * FRAGILE: HA's internal feature row element, not a documented API. It renders a card's `features:`
 * exactly as stock cards do (frontend 20261028.6: src/panels/lovelace/card-features/hui-card-features.ts;
 * properties hass, context, features, position, columns, color).
 *
 * If cards show "Funktionen nicht verfügbar" or lose their buttons after an HA update, look here first:
 * check that file in the new frontend release for a renamed element or changed properties, and update
 * this constant and the cards' feature rendering (room-tile-card, vacuum-tile-card).
 */
export const FEATURE_ROW = "hui-card-features";

/**
 * HA defines its feature row element with the tile and area cards, which load lazily; creating a stock
 * card through the documented card helpers loads it. Resolves to whether the element exists (false after
 * a 10 s timeout).
 */
export async function loadFeatureRow(
	stockCard: LovelaceCardConfig,
): Promise<boolean> {
	if (!customElements.get(FEATURE_ROW)) {
		const helpers = await window.loadCardHelpers?.();
		helpers?.createCardElement(stockCard);
		await Promise.race([
			customElements.whenDefined(FEATURE_ROW),
			new Promise((resolve) => setTimeout(resolve, 10_000)),
		]);
	}
	return customElements.get(FEATURE_ROW) !== undefined;
}

/** Whether a click came from inside a feature row (its buttons handle their own taps). */
export function fromFeatureRow(event: Event): boolean {
	return event
		.composedPath()
		.some((node) => (node as Element).localName === FEATURE_ROW);
}
