import type { Control, EntityControl } from "./config";

/** Four entities in a row at most; more go into a "…" menu. */
export const MAX_SLOTS = 4;

export type Cell =
	| { kind: "entity"; control: EntityControl; span: number }
	| { kind: "spacer"; span: number }
	| { kind: "more"; span: 1 };

export interface Arrangement {
	columns: number;
	cells: Cell[];
	/** The entities behind the "…" button, in config order. */
	overflow: EntityControl[];
}

const width = (control: Control) =>
	control.span === "rest" ? 1 : control.span;

const cell = (control: Control, span: number): Cell =>
	control.kind === "entity"
		? { kind: "entity", control, span }
		: { kind: "spacer", span };

/**
 * Place the items on a row of equal slots. `rest` items share what the others leave (the first gets the
 * remainder); they fill 4 slots unless `columns` fixes the count. Past the limit, the items up to the
 * first one that doesn't fit stay, the last slot becomes "…" and everything else (minus spacers) goes
 * into its menu, so the order never changes.
 */
export function arrangeControls(
	controls: readonly Control[],
	columns?: number,
): Arrangement {
	const limit = columns ?? MAX_SLOTS;
	const needed = controls.reduce((sum, control) => sum + width(control), 0);

	if (needed > limit) {
		const cells: Cell[] = [];
		let used = 0;
		let index = 0;
		for (; index < controls.length; index++) {
			const span = width(controls[index]);
			if (used + span > limit - 1) break;
			cells.push(cell(controls[index], span));
			used += span;
		}
		if (used < limit - 1)
			cells.push({ kind: "spacer", span: limit - 1 - used });
		cells.push({ kind: "more", span: 1 });
		const overflow = controls
			.slice(index)
			.filter((control): control is EntityControl => control.kind === "entity");
		return { columns: limit, cells, overflow };
	}

	const rests = controls.filter((control) => control.span === "rest").length;
	const total = columns ?? (rests > 0 ? MAX_SLOTS : Math.max(needed, 1));
	const fixed = needed - rests;
	const share = Math.floor((total - fixed) / Math.max(rests, 1));
	let remainder = (total - fixed) % Math.max(rests, 1);
	const cells = controls.map((control) => {
		if (control.span !== "rest") return cell(control, control.span);
		const span = share + (remainder > 0 ? 1 : 0);
		remainder = Math.max(remainder - 1, 0);
		return cell(control, span);
	});
	return { columns: total, cells, overflow: [] };
}
