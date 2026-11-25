import { UNKNOWN_BIN, type UpcomingPickupsConfig } from "./config";

/** One row of the card: the bin's icon in its colour and the due text. */
export interface PickupRow {
	icon: string;
	color: string;
	text: string;
	bold: boolean;
}

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` as local midnight (`new Date("2026-12-09")` would be UTC midnight). */
export function parseLocalDate(value: unknown): Date | undefined {
	if (typeof value !== "string") return undefined;
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return undefined;
	const [year, month, day] = match.slice(1).map(Number);
	const date = new Date(year, month - 1, day);
	return date.getMonth() === month - 1 && date.getDate() === day
		? date
		: undefined;
}

/** Calendar days from `now`'s local date to `datum`; rounded so a DST day (23 or 25 h) still counts as one. */
export function daysUntil(datum: unknown, now: Date): number | undefined {
	const date = parseLocalDate(datum);
	if (!date) return undefined;
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	return Math.round((date.getTime() - today.getTime()) / DAY_MS);
}

function dueText(days: number, dismissed: boolean): [string, boolean] {
	if (dismissed && days <= 1) return ["✓ Rausgestellt", true];
	if (days === 0) return ["Heute", true];
	if (days === 1) return ["Morgen", true];
	return [`in ${days} Tagen`, false];
}

/**
 * The rows for the entity's `termine` (already sorted, next pickup per bin) and `erledigt`. Entries without a
 * readable date or in the past are skipped; at most `max_rows`.
 */
export function pickupRows(
	termine: unknown,
	dismissed: boolean,
	config: UpcomingPickupsConfig,
	now: Date,
): PickupRow[] {
	if (!Array.isArray(termine)) return [];
	const rows: PickupRow[] = [];
	for (const entry of termine as Record<string, unknown>[]) {
		if (rows.length >= config.max_rows) break;
		const days = daysUntil(entry?.datum, now);
		if (days === undefined || days < 0) continue;
		const bin =
			config.bins.find((candidate) => candidate.name === entry.art) ??
			UNKNOWN_BIN;
		const [text, bold] = dueText(days, dismissed);
		rows.push({ icon: bin.icon, color: bin.color, text, bold });
	}
	return rows;
}
