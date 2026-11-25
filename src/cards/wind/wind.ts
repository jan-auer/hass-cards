/** The 8-point compass in German, clockwise from north. */
const CARDINALS = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"] as const;

/** `130` → `SO`: the nearest of the 8 German compass points. */
export function cardinal(degrees: number): string {
	const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
	return CARDINALS[index];
}

/** Upper limits of Beaufort 0–11 in km/h (WMO/DWD limits in m/s × 3.6); above the last is 12. */
const BEAUFORT_LIMITS = [
	1.08, 5.76, 12.24, 19.8, 28.8, 38.88, 50.04, 61.92, 74.88, 88.2, 102.6,
	117.72,
];

/** Short forms of the DWD names (Windstille, leiser Zug, leichte Brise, schwache Brise, …, Orkan). */
const BEAUFORT_WORDS = [
	"still",
	"leiser Zug",
	"leicht",
	"schwach",
	"mäßig",
	"frisch",
	"stark",
	"steif",
	"stürmisch",
	"Sturm",
	"schwerer Sturm",
	"orkanartig",
	"Orkan",
];

/** Beaufort force and its short German word for a speed in km/h. */
export function beaufort(speedKmh: number): { force: number; word: string } {
	const below = BEAUFORT_LIMITS.findIndex((limit) => speedKmh < limit);
	const force = below === -1 ? 12 : below;
	return { force, word: BEAUFORT_WORDS[force] };
}

/** km/h per unit, for the units HA's wind speed sensors use. */
const KMH_PER_UNIT: Record<string, number> = {
	"km/h": 1,
	"m/s": 3.6,
	mph: 1.609344,
	kn: 1.852,
	"ft/s": 1.09728,
};

/** A speed in the sensor's unit as km/h; an unknown unit counts as km/h. */
export function kmh(speed: number, unit: string | undefined): number {
	return speed * (KMH_PER_UNIT[unit ?? ""] ?? 1);
}
