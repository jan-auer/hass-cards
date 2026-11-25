// The small part of Home Assistant's frontend API our cards rely on. Only documented fields.

export interface HassEntity {
	entity_id: string;
	state: string;
	attributes: Record<string, unknown>;
	last_changed: string;
	last_updated: string;
}

export interface AreaEntry {
	area_id: string;
	name: string;
	picture?: string | null;
	icon?: string | null;
	/** The area's chosen temperature and humidity sensors (area settings), as the stock area card uses them. */
	temperature_entity_id?: string | null;
	humidity_entity_id?: string | null;
}

export interface EntityRegistryEntry {
	entity_id: string;
	area_id?: string | null;
	device_id?: string | null;
	/** `config` or `diagnostic`; HA's area cards skip those. */
	entity_category?: string | null;
	hidden?: boolean;
	icon?: string | null;
}

/** The `hass` object HA hands every card. It is replaced on every state change anywhere in the house. */
export interface HomeAssistant {
	states: Record<string, HassEntity>;
	/** The active theme; `darkMode` is true while HA shows the theme's dark mode. */
	themes?: { darkMode?: boolean };
	/** The user's language, e.g. `de`; `locale.language` in current HA. */
	language?: string;
	locale?: { language?: string };
	/** The WebSocket connection (home-assistant-js-websocket); subscriptions resubscribe after reconnects. */
	connection?: {
		subscribeMessage<T>(
			callback: (message: T) => void,
			message: Record<string, unknown>,
		): Promise<() => Promise<void>>;
	};
	/** HA's core config; the location is used for sun times. */
	config?: { latitude?: number; longitude?: number };
	/** Area registry (documented on the hass object); `picture` is the area's photo URL. */
	areas?: Record<string, AreaEntry>;
	/** Entity registry display entries (documented on the hass object). */
	entities?: Record<string, EntityRegistryEntry>;
	/** Device registry entries (documented on the hass object); only the area matters to us. */
	devices?: Record<string, { area_id?: string | null }>;
	/** The entity's state as HA shows it, translated and with units (documented on the hass object). */
	formatEntityState?(entity: HassEntity): string;
	/** The entity's name as stock cards show it; `name` = text or HA name items (frontend 2025.12+, items 2026.11). */
	formatEntityName?(entity: HassEntity, name?: EntityName): string;
	/** Send a WebSocket command (documented on the hass object). */
	callWS?<T>(message: Record<string, unknown>): Promise<T>;
}

/** The card config as HA passes it: `type` plus whatever the user wrote. Unknown keys are kept. */
export interface LovelaceCardConfig {
	type: string;
	[key: string]: unknown;
}

export interface NavigateActionConfig {
	action: "navigate";
	navigation_path: string;
	navigation_replace?: boolean;
}

export interface PerformActionConfig {
	action: "perform-action";
	perform_action: string;
	data?: Record<string, unknown>;
	target?: Record<string, unknown>;
}

/** The standard card actions HA's `hass-action` handler understands. */
export type ActionConfig =
	| NavigateActionConfig
	| PerformActionConfig
	| { action: "more-info" | "toggle" | "none" }
	| { action: "url"; url_path: string };

/** Any card element HA creates: our children get `hass` (and `preview` in the editor) from us. */
export interface LovelaceCardElement extends HTMLElement {
	hass?: HomeAssistant;
	preview?: boolean;
}

/** What `window.loadCardHelpers()` resolves to (documented in the custom card docs); only what we use. */
export interface CardHelpers {
	createCardElement(config: LovelaceCardConfig): LovelaceCardElement;
}

/** One entry of `window.customCards`, which feeds HA's card picker. */
export interface CustomCardEntry {
	type: string;
	name: string;
	description: string;
	preview?: boolean;
}

/** One entry of `window.customCardFeatures`, which feeds HA's feature picker (custom card features docs). */
export interface CustomCardFeatureEntry {
	type: string;
	name: string;
	/** Whether the feature fits the card it's offered for; true for every card when left out. */
	isSupported?: (
		hass: HomeAssistant,
		context: Record<string, unknown>,
	) => boolean;
	/** Whether the feature has options to edit in the card editor. */
	configurable?: boolean;
}

declare global {
	interface Window {
		customCards?: CustomCardEntry[];
		customCardFeatures?: CustomCardFeatureEntry[];
		loadCardHelpers?: () => Promise<CardHelpers>;
	}
}

/** A card's `name` as HA's stock cards take it: plain text, or name items built from the registries (2026.11). */
export type EntityNameItem =
	| { type: "floor" | "area" | "parent_device" | "device" | "entity" }
	| { type: "text"; text: string };
export type EntityName = string | EntityNameItem | EntityNameItem[];
