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
 * The active room in a neutral tone. Dark: a soft white glow with a faint wash. Light: a
 * lifted white card.
 */
const NEUTRAL: Record<Mode, HighlightStyle> = {
	dark: {
		background: wash("rgba(255, 255, 255, 0.03)"),
		shadow: `${ring("rgba(255, 255, 255, 0.22)")}, 0 0 10px rgba(255, 255, 255, 0.08), ${BASE}`,
	},
	light: {
		background: "#fff",
		shadow: "0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)",
	},
};

/** The room tint and the warm tone. */
const TINTS = {
	room: { light: { wash: 0.16, line: 0.42 }, dark: { wash: 0.22, line: 0.5 } },
	warm: {
		light: { rgb: "255, 149, 0", wash: 0.13, line: 0.38 },
		dark: { rgb: "255, 159, 10", wash: 0.14, line: 0.4 },
	},
} as const;

/** The style for an active room; `roomRgb` is the room colour as `r, g, b`. */
export function highlightStyle(
	highlight: Exclude<Highlight, "none">,
	mode: Mode,
	roomRgb: string,
): HighlightStyle {
	if (highlight === "room" || highlight === "warm") {
		const tint =
			highlight === "warm"
				? TINTS.warm[mode]
				: { rgb: roomRgb, ...TINTS.room[mode] };
		return {
			background: wash(`rgba(${tint.rgb}, ${tint.wash})`),
			shadow: `${ring(`rgba(${tint.rgb}, ${tint.line})`)}, ${BASE}`,
		};
	}
	return NEUTRAL[mode];
}
