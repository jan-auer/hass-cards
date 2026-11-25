import type { LovelaceCardConfig } from "../../ha/types";

export interface TabConfig {
	/** A view path relative to the current dashboard (`raeume`), or an absolute path (`/wartung/akkus`). */
	path: string;
	icon: string;
	/** Icon while the tab is active; defaults to `icon`. */
	active_icon?: string;
	/** Accessible name and tooltip; the bar itself shows icons only. */
	label: string;
}

export interface TabBarConfig extends LovelaceCardConfig {
	tabs: TabConfig[];
	/** On a subpage: the tab to highlight, written like a tab path. */
	parent_tab?: string;
}

function readTab(raw: unknown, index: number): TabConfig {
	const tab = (raw ?? {}) as Partial<Record<keyof TabConfig, unknown>>;
	for (const key of ["path", "icon", "label"] as const) {
		if (typeof tab[key] !== "string" || tab[key] === "") {
			throw new Error(`Tab ${index + 1}: "${key}" fehlt`);
		}
	}
	return { ...(tab as TabConfig) };
}

/** Validate a user config. Throws only when the bar can't render, so HA shows its error card in this slot. */
export function normalizeConfig(config: LovelaceCardConfig): TabBarConfig {
	const { tabs, parent_tab } = config;
	if (!Array.isArray(tabs) || tabs.length === 0)
		throw new Error('"tabs" muss eine Liste mit mindestens einem Tab sein');
	if (parent_tab !== undefined && typeof parent_tab !== "string") {
		throw new Error('"parent_tab" muss ein Pfad sein');
	}
	return {
		...config,
		tabs: tabs.map(readTab),
		parent_tab: parent_tab || undefined,
	};
}

type FormField = { name: string; selector?: Record<string, unknown> };

const LABELS: Record<string, string> = {
	parent_tab: "Übergeordneter Tab",
	tabs: "Tabs",
};

const HELPERS: Record<string, string> = {
	parent_tab:
		"Nur auf Unterseiten: Pfad des Tabs, der hier hervorgehoben wird, z. B. raeume.",
	tabs: "Pfade ohne / gelten im aktuellen Dashboard.",
};

/** HA renders this with its own form; no editor element of ours. */
export const configForm = {
	schema: [
		{ name: "parent_tab", selector: { text: {} } },
		{
			name: "tabs",
			selector: {
				object: {
					multiple: true,
					label_field: "label",
					fields: {
						label: { label: "Name", required: true, selector: { text: {} } },
						path: { label: "Pfad", required: true, selector: { text: {} } },
						icon: { label: "Symbol", required: true, selector: { icon: {} } },
						active_icon: {
							label: "Symbol, wenn aktiv",
							selector: { icon: {} },
						},
					},
				},
			},
		},
	],
	computeLabel: (field: FormField) => LABELS[field.name],
	computeHelper: (field: FormField) => HELPERS[field.name],
	assertConfig: (config: LovelaceCardConfig) => {
		normalizeConfig(config);
	},
};
