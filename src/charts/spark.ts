import { css, html, svg, type TemplateResult } from "lit";

export interface SparkOptions {
	/** Mark the curve's high (orange) and low (blue) with small dots. */
	extremes: boolean;
	/** Space kept free at the bottom (for labels). */
	bottom: number;
	/** [index, mm/h] bars behind the curve while it rains. */
	rainBars: readonly [number, number][];
	/** Text under the curve at data indexes; the first is left-aligned, the last right-aligned. */
	labels?: readonly { index: number; text: string }[];
}

/** Inset of the curve from the box edges. */
const PAD = 3;

/**
 * The 24 h curve: a 1.8 px line in `--_curve` over a soft
 * fill, optional high/low dots, a ringed "now" dot, rain bars behind it. The fill is a CSS gradient clipped
 * to the curve, because SVG gradients referenced by id are unreliable inside shadow roots on Safari.
 */
export function spark(
	values: readonly number[],
	width: number,
	height: number,
	options: SparkOptions,
): TemplateResult {
	const pad = PAD;
	const low = Math.min(...values);
	const high = Math.max(...values);
	const last = values.length - 1;
	const x = (index: number) =>
		pad + ((width - pad * 2) * index) / Math.max(1, last);
	const y = (value: number) =>
		pad +
		(height - pad * 2 - options.bottom) *
			(1 - (value - low) / (high - low || 1));
	const coords = values.map((value, index) => [x(index), y(value)] as const);
	const points = coords
		.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`)
		.join(" ");
	// Like an SVG gradient in object-bounding-box units, the fill fades from the curve's highest point.
	const top = y(high);
	const clip = [
		`${x(0).toFixed(1)}px ${(height - top).toFixed(1)}px`,
		...coords.map(
			([px, py]) => `${px.toFixed(1)}px ${(py - top).toFixed(1)}px`,
		),
		`${x(last).toFixed(1)}px ${(height - top).toFixed(1)}px`,
	].join(", ");
	const base = height - options.bottom;

	return html`<div class="spark" style="width: ${width}px; height: ${height}px">
		<div class="spark-fill" style="top: ${top.toFixed(1)}px; clip-path: polygon(${clip}); -webkit-clip-path: polygon(${clip})"></div>
		${svg`<svg viewBox="0 0 ${width} ${height}" width=${width} height=${height} aria-hidden="true">
			${options.rainBars.map(([index, rate]) => {
				const barHeight = Math.min(base - 4, 5 + rate * 4);
				return svg`<rect class="rain-bar" x=${(x(index) - 3).toFixed(1)} y=${(base - barHeight).toFixed(1)} width="6" height=${barHeight.toFixed(1)} rx="1.5"></rect>`;
			})}
			<polyline class="line" points=${points}></polyline>
			${
				options.extremes
					? svg`<circle class="high" cx=${x(values.indexOf(high))} cy=${y(high)} r="2.2"></circle><circle class="low" cx=${x(values.indexOf(low))} cy=${y(low)} r="2.2"></circle>`
					: null
			}
			<circle class="now" cx=${x(last)} cy=${y(values[last])} r="3"></circle>
			${
				options.labels?.map(({ index, text }) => {
					const anchor =
						index === 0 ? "start" : index === last ? "end" : "middle";
					return svg`<text class="label" x=${x(index)} y=${height - 2} text-anchor=${anchor}>${text}</text>`;
				}) ?? null
			}
		</svg>`}
	</div>`;
}

/**
 * Styles for `spark()`. The host sets `--_curve` (line, high dot, now dot), `--_curve-fill` (the colour at
 * 28 % for the top of the fill) and `--_rain-bar`; the now dot's ring is the card's background.
 */
export const sparkStyles = css`
	.spark {
		position: relative;
		flex: none;
	}
	.spark svg {
		position: absolute;
		inset: 0;
		overflow: visible;
	}
	.spark-fill {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, var(--_curve-fill, rgba(255, 149, 0, 0.28)), transparent);
	}
	.spark .line {
		fill: none;
		stroke: var(--_curve, #ff9500);
		stroke-width: 1.8;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.spark .high {
		fill: var(--_curve, #ff9500);
	}
	.spark .low {
		fill: var(--accent-color, #007aff);
	}
	.spark .now {
		fill: var(--_curve, #ff9500);
		stroke: var(--ha-card-background, var(--card-background-color, #fff));
		stroke-width: 1.5;
	}
	.spark .rain-bar {
		fill: var(--_rain-bar, #30b3ff);
		opacity: 0.85;
	}
	.spark .label {
		font: 9.5px -apple-system, system-ui, sans-serif;
		fill: var(--secondary-text-color);
	}
`;
