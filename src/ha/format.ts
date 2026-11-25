import type { HomeAssistant } from "./types";

/** `10,6` / `−2,1`: German decimals with a real minus sign. */
export function decimal(
	value: number,
	digits: number,
	language: string,
): string {
	return value
		.toLocaleString(language, {
			minimumFractionDigits: digits,
			maximumFractionDigits: digits,
		})
		.replace("-", "−");
}

/** The user's language as HA reports it (`locale.language` in current HA), German by default. */
export function languageOf(hass: HomeAssistant | undefined): string {
	return hass?.locale?.language ?? hass?.language ?? "de";
}

/** An entity's state as a number; undefined while it's missing, unavailable or not numeric. */
export function numericState(
	hass: HomeAssistant | undefined,
	entityId: string | undefined,
): number | undefined {
	const state = entityId ? hass?.states[entityId]?.state : undefined;
	const value = Number(state);
	return state === undefined || state === "" || !Number.isFinite(value)
		? undefined
		: value;
}
