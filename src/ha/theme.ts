import type { HomeAssistant } from "./types";

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
