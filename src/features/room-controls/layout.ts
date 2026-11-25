import type { Control, EntityControl } from "./config";

/** Four slots in a row at most; the config refuses more. */
export const MAX_SLOTS = 4;

export type Cell =
	| { kind: "entity"; control: EntityControl; span: number }
	| { kind: "spacer"; span: number };

export interface Arrangement {
	columns: number;
	cells: Cell[];
}

export const slotWidth = (control: Control) =>
	control.span === "rest" ? 1 : control.span;

const cell = (control: Control, span: number): Cell =>
	control.kind === "entity"
		? { kind: "entity", control, span }
		: { kind: "spacer", span };

/**
 * Place the items on a row of equal slots. `rest` items share what the others leave (the first gets the
 * remainder); they fill 4 slots unless `columns` fixes the count.
 */
export function arrangeControls(
	controls: readonly Control[],
	columns?: number,
): Arrangement {
	const needed = controls.reduce((sum, control) => sum + slotWidth(control), 0);
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
	return { columns: total, cells };
}
