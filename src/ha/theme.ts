import { css } from "lit";
import type { HomeAssistant } from "./types";

/** A faint neutral for empty tracks and inactive fills, from the theme's text colour (light and dark alike). */
export const NEUTRAL_TRACK = css`rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.1)`;

/** A hairline between rows: the theme's divider colour. */
export const HAIRLINE = css`var(--divider-color, rgba(0, 0, 0, 0.12))`;

/**
 * Mirror HA's light/dark mode as a `dark` attribute, for designs whose values aren't theme variables.
 * An attribute change re-styles without re-rendering.
 */
export function reflectDarkMode(
	element: HTMLElement,
	hass: HomeAssistant | undefined,
): void {
	element.toggleAttribute("dark", hass?.themes?.darkMode === true);
}
