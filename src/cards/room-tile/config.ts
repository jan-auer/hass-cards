import type { LovelaceCardConfig } from "../../ha/types";

/**
 * The room's identity as a photo, a colour strip or nothing extra. `photo` lies over the
 * stock card's icon (36 px); `photo-large` draws its own header (42 px photo, name, sensors) above HA's
 * feature row element.
 */
export const IDENTITIES = ["photo", "photo-large", "strip", "none"] as const;
export type Identity = (typeof IDENTITIES)[number];

/** Highlight an active room in its colour, a warm tone, a neutral tone, or not at all. */
export const HIGHLIGHTS = ["room", "warm", "neutral", "none"] as const;
export type Highlight = (typeof HIGHLIGHTS)[number];

export interface RoomTileConfig {
	area: string;
	identity: Identity;
	highlight: Highlight;
	/** Any of these active (HA's `stateActive`) makes the room active. */
	highlight_entities: string[];
	/** `#rrggbb` or a theme colour name (`teal`, as HA's colour picker writes it); also the stock area card's icon colour. */
	color?: string;
	/** A photo instead of the area's own picture. */
	image?: string;
	features_position: "bottom" | "inline";
	/** Feature rows below the info row (bottom position). */
	feature_rows: number;
	alert_classes: string[];
	sensor_classes: string[];
	exclude_entities: string[];
	/** The stock area card's config: everything except our own options. */
	area_card: LovelaceCardConfig;
}

const OWN_KEYS = [
	"type",
	"identity",
	"highlight",
	"highlight_entities",
	"image",
];

const strings = (value: unknown): string[] =>
	Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];

function pick<T extends string>(
	value: unknown,
	options: readonly T[],
	key: string,
): T {
	if (value === undefined) return "none" as T;
	if (!options.includes(value as T))
		throw new Error(`"${key}" muss ${options.join(", ")} sein`);
	return value as T;
}

/** The room colour for CSS: hex as is, a theme colour name as HA's variable (`teal` → `--teal-color`). */
export function roomColor(color: string | undefined): string {
	if (!color) return DEFAULT_ROOM_COLOR;
	return color.startsWith("#") ? color : `var(--${color}-color)`;
}

const DEFAULT_ROOM_COLOR = "#889948";

/** Validate a card config. Throws only when the card can't render, so HA shows its error card. */
export function normalizeConfig(config: LovelaceCardConfig): RoomTileConfig {
	if (typeof config.area !== "string" || !config.area)
		throw new Error('"area" fehlt');
	if (
		config.color !== undefined &&
		!/^(#[0-9a-f]{6}|[a-z]+(-[a-z]+)*)$/i.test(String(config.color))
	)
		throw new Error('"color" muss eine Farbe wie #889948 oder teal sein');
	const rest = Object.fromEntries(
		Object.entries(config).filter(([key]) => !OWN_KEYS.includes(key)),
	);
	const features = Array.isArray(config.features) ? config.features : [];
	const position = config.features_position === "inline" ? "inline" : "bottom";
	return {
		area: config.area,
		identity: pick(config.identity, IDENTITIES, "identity"),
		highlight: pick(config.highlight, HIGHLIGHTS, "highlight"),
		highlight_entities: strings(config.highlight_entities),
		...(config.color ? { color: String(config.color) } : {}),
		...(typeof config.image === "string" && config.image
			? { image: config.image }
			: {}),
		features_position: position,
		feature_rows: position === "bottom" ? features.length : 0,
		alert_classes: strings(config.alert_classes),
		sensor_classes: strings(config.sensor_classes),
		exclude_entities: strings(config.exclude_entities),
		area_card: { type: "area", display_type: "compact", ...rest },
	};
}
