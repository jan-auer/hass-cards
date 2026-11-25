import type { ActionConfig, LovelaceCardConfig } from "../../ha/types";

/** How many slots an item takes: one, two, or what's left of the row. */
export type Span = 1 | 2 | "rest";

export interface EntityControl {
	kind: "entity";
	entity: string;
	span: Span;
	/** A fixed icon; default: from the entity's domain and state. */
	icon?: string;
	/** Default: toggle. */
	tap_action?: ActionConfig;
	/** Default: more-info. */
	hold_action?: ActionConfig;
}

export interface SpacerControl {
	kind: "spacer";
	span: Span;
}

export type Control = EntityControl | SpacerControl;

export const SPACER_STYLES = ["empty", "ghost"] as const;
export type SpacerStyle = (typeof SPACER_STYLES)[number];

export interface RoomControlsConfig {
	controls: Control[];
	spacer_style: SpacerStyle;
	/** Fixed slot count (1–4); default: what the items need, 4 when one takes the rest. */
	columns?: number;
}

/** Spans as YAML writes them (1, 2) and as the editor's select writes them ("1", "2"). */
const SPANS: Readonly<Record<string, Span>> = {
	"1": 1,
	"2": 2,
	rest: "rest",
};

function readSpan(raw: unknown, position: number): Span {
	if (raw === undefined || raw === "") return 1;
	const span = SPANS[String(raw)];
	if (!span)
		throw new Error(`Eintrag ${position}: "span" muss 1, 2 oder rest sein`);
	return span;
}

function readControl(raw: unknown, index: number): Control {
	const position = index + 1;
	if (raw === "spacer") return { kind: "spacer", span: 1 };
	if (typeof raw === "string") {
		if (!raw.includes("."))
			throw new Error(`Eintrag ${position}: "${raw}" ist keine Entität`);
		return { kind: "entity", entity: raw, span: 1 };
	}
	const item = (raw ?? {}) as Record<string, unknown>;
	if (item.type === "spacer")
		return { kind: "spacer", span: readSpan(item.span, position) };
	if (typeof item.entity !== "string" || !item.entity.includes("."))
		throw new Error(`Eintrag ${position}: "entity" fehlt`);
	const { entity, icon, tap_action, hold_action } = item;
	return {
		kind: "entity",
		entity,
		span: readSpan(item.span, position),
		...(typeof icon === "string" && icon ? { icon } : {}),
		...(tap_action ? { tap_action: tap_action as ActionConfig } : {}),
		...(hold_action ? { hold_action: hold_action as ActionConfig } : {}),
	};
}

/** Validate a feature config. Throws only when the row can't render, so HA shows its error card. */
export function normalizeConfig(
	config: LovelaceCardConfig,
): RoomControlsConfig {
	const { controls = [], spacer_style = "empty", columns } = config;
	if (!Array.isArray(controls))
		throw new Error('"controls" muss eine Liste sein');
	if (!SPACER_STYLES.includes(spacer_style as SpacerStyle))
		throw new Error('"spacer_style" muss empty oder ghost sein');
	if (
		columns !== undefined &&
		!(
			Number.isInteger(columns) &&
			(columns as number) >= 1 &&
			(columns as number) <= 4
		)
	)
		throw new Error('"columns" muss 1 bis 4 sein');
	return {
		controls: controls.map(readControl),
		spacer_style: spacer_style as SpacerStyle,
		...(columns !== undefined ? { columns: columns as number } : {}),
	};
}

interface FormField {
	name: string;
}

const LABELS: Record<string, string> = {
	controls: "Knöpfe",
	spacer_style: "Platzhalter",
	columns: "Feste Anzahl Plätze",
};

const HELPERS: Record<string, string> = {
	columns:
		"1–4. Leer: so viele, wie die Knöpfe brauchen (4, wenn einer den Rest nimmt). Mehr als 4: „…“-Menü.",
};

/**
 * The card editor's form (HA's `getConfigForm`): a sortable list of buttons and spacers, each edited in
 * HA's own dialog, and the row settings. The short string form (`- light.x`) has no place in the list,
 * so such a config opens in the YAML editor.
 */
export const configForm = {
	schema: [
		{
			name: "controls",
			selector: {
				object: {
					multiple: true,
					// The list shows the entity's name; spacers show "Platzhalter" below their empty name.
					label_field: "entity",
					description_field: "type",
					fields: {
						type: {
							label: "Art",
							default: "entity",
							selector: {
								select: {
									mode: "dropdown",
									options: [
										{ value: "entity", label: "Knopf" },
										{ value: "spacer", label: "Platzhalter" },
									],
								},
							},
						},
						entity: { label: "Entität", selector: { entity: {} } },
						span: {
							label: "Breite",
							selector: {
								select: {
									mode: "dropdown",
									options: [
										{ value: "1", label: "1 Platz" },
										{ value: "2", label: "2 Plätze" },
										{ value: "rest", label: "Rest der Zeile" },
									],
								},
							},
						},
						icon: {
							label: "Symbol",
							description: "Leer: passend zu Gerät und Zustand",
							selector: { icon: {} },
						},
						tap_action: {
							label: "Tippen",
							description: "Leer: umschalten",
							selector: { ui_action: {} },
						},
						hold_action: {
							label: "Halten",
							description: "Leer: Details",
							selector: { ui_action: {} },
						},
					},
				},
			},
		},
		{
			name: "spacer_style",
			selector: {
				select: {
					mode: "dropdown",
					options: [
						{ value: "empty", label: "Leer" },
						{ value: "ghost", label: "Angedeutet" },
					],
				},
			},
		},
		{
			name: "columns",
			selector: { number: { min: 1, max: 4, mode: "box" } },
		},
	],
	computeLabel: (field: FormField) => LABELS[field.name],
	computeHelper: (field: FormField) => HELPERS[field.name],
	assertConfig: (config: LovelaceCardConfig) => {
		normalizeConfig(config);
		const controls = config.controls;
		if (
			Array.isArray(controls) &&
			controls.some((control) => typeof control === "string")
		)
			throw new Error(
				"Kurzform (- light.x) bitte im YAML bearbeiten, oder als - entity: light.x schreiben",
			);
	},
};
