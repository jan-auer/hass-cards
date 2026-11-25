import { css } from "lit";

/** A card's grid hints (`getGridOptions()` and the config's `grid_options`), as HA's sections read them. */
export interface GridOptions {
	columns?: number | "full";
	rows?: number | "auto";
	min_columns?: number;
	max_columns?: number;
	min_rows?: number;
	max_rows?: number;
}

export interface GridSize {
	columns: number | "full";
	rows: number | "auto";
}

const clamp = (value: number, min?: number, max?: number) =>
	Math.min(Math.max(value, min ?? value), max ?? value);

/**
 * A card's cell size, as HA computes it (frontend 20261028.6: src/panels/lovelace/common/
 * compute-card-grid-size.ts `computeCardGridSize`): 12 columns and auto height unless set, numbers
 * clamped to their min/max.
 */
export function cardGridSize(options: GridOptions): GridSize {
	const columns = options.columns ?? 12;
	const rows = options.rows ?? "auto";
	return {
		columns:
			typeof columns === "number"
				? clamp(columns, options.min_columns, options.max_columns)
				: columns,
		rows:
			typeof rows === "number"
				? clamp(rows, options.min_rows, options.max_rows)
				: rows,
	};
}

/**
 * HA's grid section layout (frontend 20261028.6: src/panels/lovelace/sections/hui-grid-section.ts
 * styles): 12 columns per section column span, rows of `--ha-section-grid-row-height` (56 px), gaps of
 * `--ha-section-grid-row-gap`/`--ha-section-grid-column-gap` (8 px). A cell spans `--column-size` columns
 * and `--row-size` rows; `fit-rows` fixes its height, `full-width` spans the row, `hidden` drops it.
 * `--column-span` is inherited from the section's cell in the sections view.
 */
export const sectionGridStyles = css`
	.grid {
		--_columns: calc(12 * var(--column-span, 1));
		--_row-gap: var(--ha-section-grid-row-gap, 8px);
		--_column-gap: var(--ha-section-grid-column-gap, 8px);
		--_row-height: var(--ha-section-grid-row-height, 56px);
		display: grid;
		grid-template-columns: repeat(var(--_columns), minmax(0, 1fr));
		grid-auto-rows: auto;
		row-gap: var(--_row-gap);
		column-gap: var(--_column-gap);
	}
	.cell {
		position: relative;
		border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg, 12px));
		grid-row: span var(--row-size, 1);
		grid-column: span min(var(--column-size, 1), var(--_columns));
	}
	.cell.fit-rows {
		height: calc(var(--row-size, 1) * (var(--_row-height) + var(--_row-gap)) - var(--_row-gap));
	}
	.cell.full-width {
		grid-column: 1 / -1;
	}
	.cell.hidden {
		display: none;
	}
`;
