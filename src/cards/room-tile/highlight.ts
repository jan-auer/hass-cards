import type { Highlight } from "./config";

export type Mode = "light" | "dark";

/**
 * What a highlight sets on the card's public theme variables: `background` replaces
 * `--ha-card-background` (undefined: unchanged), `shadow` replaces `--ha-card-box-shadow`. Both may build on
 * the theme's own values through `var(--_card-background)` / `var(--_card-shadow)`.
 */
export interface HighlightStyle {
	background?: string;
	shadow: string;
}

const wash = (color: string) =>
	`linear-gradient(${color}, ${color}), var(--_card-background)`;
const ring = (color: string) => `inset 0 0 0 1px ${color}`;
const BASE = "var(--_card-shadow)";

/**
 * The active room in a neutral tone. Dark: lit from above like the theme's card edge (a top line and a fainter bottom line over a
 * faint even ring), a soft white glow and a faint wash. Light: a lifted white card.
 */
const NEUTRAL: Record<Mode, HighlightStyle> = {
	dark: {
		background: wash("rgba(255, 255, 255, 0.03)"),
		shadow: `inset 0 1px 0 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 0 rgba(255, 255, 255, 0.025), ${ring("rgba(255, 255, 255, 0.06)")}, 0 0 10px rgba(255, 255, 255, 0.06), ${BASE}`,
	},
	light: {
		background: "#fff",
		shadow: "0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)",
	},
};

/** The room tint and the warm tone; wash and line in percent of the colour. */
const TINTS = {
	room: { light: { wash: 16, line: 42 }, dark: { wash: 22, line: 50 } },
	warm: {
		light: { color: "#ff9500", wash: 13, line: 38 },
		dark: { color: "#ff9f0a", wash: 14, line: 40 },
	},
} as const;

/** `color` at `percent` opacity; works for hex and theme variables alike. */
const tinted = (color: string, percent: number) =>
	`color-mix(in srgb, ${color} ${percent}%, transparent)`;

/** The style for an active room; `roomColor` is any CSS colour (hex or a theme variable). */
export function highlightStyle(
	highlight: Exclude<Highlight, "none">,
	mode: Mode,
	roomColor: string,
): HighlightStyle {
	if (highlight === "room" || highlight === "warm") {
		const tint =
			highlight === "warm"
				? TINTS.warm[mode]
				: { color: roomColor, ...TINTS.room[mode] };
		return {
			background: wash(tinted(tint.color, tint.wash)),
			shadow: `${ring(tinted(tint.color, tint.line))}, ${BASE}`,
		};
	}
	return NEUTRAL[mode];
}
