// HA's form editor for vacuum-tile-card (`getConfigForm`). Features stay in YAML / the features editor.

const LABELS: Record<string, string> = {
	entity: "Saugroboter",
	name: "Name",
	icon: "Symbol",
	battery_entity: "Akku-Sensor",
	charging_entity: "Lade-Sensor (an = lädt)",
	state_detail: "Detail nach dem Status (Vorlage)",
	lines:
		"Zeilen unten, wenn keine Funktionen zu sehen sind (Vorlage, **fett**)",
	warning: "Warnung am Symbol (Vorlage, wahr = Abzeichen)",
	warning_icon: "Symbol der Warnung",
	features_states: "Funktionen in diesen Zuständen",
	active: "Aktiv (Vorlage, wahr = Funktionen statt Zeilen)",
	tap_action: "Tippen auf die Karte",
	hold_action: "Gedrückt halten",
	icon_tap_action: "Tippen auf das Symbol",
};

const HELPERS: Record<string, string> = {
	warning_icon: "Leer: Ausrufezeichen.",
	features_states: "Leer: jeder aktive Zustand (nicht angedockt).",
};

export const configForm = {
	schema: [
		{
			name: "entity",
			required: true,
			selector: { entity: { domain: "vacuum" } },
		},
		{
			type: "grid",
			name: "",
			schema: [
				{ name: "name", selector: { text: {} } },
				{
					name: "icon",
					selector: { icon: {} },
					context: { icon_entity: "entity" },
				},
			],
		},
		{
			name: "battery_entity",
			selector: { entity: { domain: "sensor", device_class: "battery" } },
		},
		{
			name: "charging_entity",
			selector: { entity: { domain: "binary_sensor" } },
		},
		{ name: "state_detail", selector: { template: {} } },
		{ name: "lines", selector: { template: {} } },
		{ name: "warning", selector: { template: {} } },
		{ name: "warning_icon", selector: { icon: {} } },
		{
			name: "features_states",
			selector: {
				select: {
					multiple: true,
					custom_value: true,
					options: [
						{ value: "cleaning", label: "Reinigt" },
						{ value: "paused", label: "Pausiert" },
						{ value: "returning", label: "Kehrt zurück" },
						{ value: "error", label: "Fehler" },
						{ value: "idle", label: "Untätig" },
						{ value: "docked", label: "Angedockt" },
					],
				},
			},
		},
		{ name: "active", selector: { template: {} } },
		{ name: "tap_action", selector: { ui_action: {} } },
		{ name: "hold_action", selector: { ui_action: {} } },
		{ name: "icon_tap_action", selector: { ui_action: {} } },
	],
	computeLabel: (schema: { name: string }) =>
		LABELS[schema.name] ?? schema.name,
	computeHelper: (schema: { name: string }) => HELPERS[schema.name],
};
