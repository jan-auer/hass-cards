/**
 * The page the cards are shot on: a light and a dark set of theme variables and a soft view background, so the
 * images look like a real dashboard; the cards fall back to HA's defaults for the rest.
 */
export type Mode = "light" | "dark";

const SHARED: Record<string, string> = {
	"ha-font-family-body": "system-ui, sans-serif",
	"ha-line-height-condensed": "1.2",
	"ha-line-height-normal": "1.41",
	"ha-border-radius-lg": "16px",
	"ha-card-border-radius": "20px",
	"ha-card-border-width": "0",
};

const THEME: Record<Mode, Record<string, string>> = {
	light: {
		"rgb-primary-color": "255, 149, 0",
		"rgb-accent-color": "0, 122, 255",
		"rgb-primary-text-color": "0, 0, 0",
		"rgb-secondary-text-color": "60, 60, 67",
		"rgb-card-background-color": "255, 255, 255",
		"primary-color": "#FF9500",
		"accent-color": "#007AFF",
		"primary-background-color": "#F4F5F8",
		"secondary-background-color": "#ECEEF3",
		"card-background-color": "#F4F5F8",
		"ha-card-background": "rgba(255, 255, 255, 0.48)",
		"ha-card-border-color": "rgba(60, 60, 67, 0.10)",
		"ha-card-box-shadow":
			"inset 0 1px 0 0 rgba(255, 255, 255, 0.40), 0 1px 3px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.05)",
		"primary-text-color": "#000000",
		"secondary-text-color": "rgba(60, 60, 67, 0.6)",
		"disabled-text-color": "rgba(60, 60, 67, 0.3)",
		"divider-color": "rgba(60, 60, 67, 0.18)",
		"state-icon-color": "#44739e",
	},
	dark: {
		"rgb-primary-color": "255, 138, 61",
		"rgb-accent-color": "10, 132, 255",
		"rgb-primary-text-color": "255, 255, 255",
		"rgb-secondary-text-color": "235, 235, 245",
		"rgb-card-background-color": "22, 21, 28",
		"primary-color": "#FF8A3D",
		"accent-color": "#0A84FF",
		"primary-background-color": "#0E0F14",
		"secondary-background-color": "#13141A",
		"card-background-color": "#13141A",
		"ha-card-background": "rgba(22, 21, 28, 0.55)",
		"ha-card-border-color": "rgba(255, 255, 255, 0.07)",
		"ha-card-box-shadow":
			"inset 0 1px 0 0 rgba(255, 255, 255, 0.10), 0 1px 3px rgba(0, 0, 0, 0.5), 0 12px 32px rgba(0, 0, 0, 0.45)",
		"primary-text-color": "#FFFFFF",
		"secondary-text-color": "rgba(235, 235, 245, 0.6)",
		"disabled-text-color": "rgba(235, 235, 245, 0.3)",
		"divider-color": "rgba(84, 84, 88, 0.6)",
		"state-icon-color": "#44739e",
	},
};

/** The view background (a `lovelace-background` value). */
const BACKGROUND: Record<Mode, string> = {
	light: `radial-gradient(ellipse 95% 75% at 8% 0%, rgba(185, 217, 255, 0.85), transparent 70%),
		radial-gradient(ellipse 85% 70% at 95% 95%, rgba(255, 224, 200, 0.75), transparent 72%),
		radial-gradient(ellipse 80% 65% at 95% 5%, rgba(223, 243, 252, 0.85), transparent 75%),
		radial-gradient(ellipse 60% 55% at 5% 90%, rgba(228, 212, 226, 0.50), transparent 75%),
		linear-gradient(180deg, #F2F2F7 0%, #ECECF1 100%)`,
	dark: `radial-gradient(ellipse 90% 70% at 88% 10%, rgba(28, 44, 76, 0.82), transparent 72%),
		radial-gradient(ellipse 80% 65% at 10% 90%, rgba(50, 48, 58, 0.72), transparent 75%),
		radial-gradient(ellipse 42% 35% at 96% 96%, rgba(82, 44, 30, 0.70), transparent 78%),
		radial-gradient(ellipse 42% 35% at 96% 96%, rgba(255, 138, 61, 0.13), transparent 80%),
		linear-gradient(160deg, #0e0f14 0%, #16131c 100%)`,
};

/** Room around the cards, so the theme's card shadow isn't clipped. */
export const STAGE_PADDING = 28;

/** A themed page area of `width` (the cards' grid width, without the padding), attached to the body. */
export function createStage(mode: Mode, width: number): HTMLElement {
	const stage = document.createElement("div");
	for (const [name, value] of Object.entries({ ...SHARED, ...THEME[mode] }))
		stage.style.setProperty(`--${name}`, value);
	Object.assign(stage.style, {
		boxSizing: "content-box",
		width: `${width}px`,
		padding: `${STAGE_PADDING}px`,
		background: BACKGROUND[mode],
		colorScheme: mode,
		color: "var(--primary-text-color)",
		fontFamily: "var(--ha-font-family-body)",
		fontSize: "14px",
		lineHeight: "var(--ha-line-height-normal)",
		webkitFontSmoothing: "antialiased",
	});
	document.body.style.margin = "0";
	document.body.append(stage);
	return stage;
}
