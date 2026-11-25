import * as mdi from "@mdi/js";
import { css, html, LitElement, svg } from "lit";

/**
 * Stand-ins for the two HA elements the cards render, `ha-card` and `ha-icon`, styled like HA's own
 * (frontend: src/components/ha-card.ts, ha-svg-icon.ts) so the screenshots look as in a dashboard.
 */
class StubCard extends LitElement {
	static override styles = css`
		:host {
			display: block;
			position: relative;
			box-sizing: border-box;
			background: var(--ha-card-background, var(--card-background-color, white));
			-webkit-backdrop-filter: var(--ha-card-backdrop-filter, none);
			backdrop-filter: var(--ha-card-backdrop-filter, none);
			box-shadow: var(--ha-card-box-shadow, none);
			border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg, 12px));
			border-width: var(--ha-card-border-width, 1px);
			border-style: solid;
			border-color: var(--ha-card-border-color, var(--divider-color, #e0e0e0));
			color: var(--primary-text-color);
		}
	`;

	override render() {
		return html`<slot></slot>`;
	}
}

const icons = mdi as Record<string, string>;

/** `mdi:weather-partly-cloudy` → the path of `mdiWeatherPartlyCloudy`. */
function iconPath(icon: string): string {
	const name = icon
		.replace(/^mdi:/, "mdi-")
		.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase());
	const path = icons[name];
	if (!path) throw new Error(`ha-icon stand-in: unknown icon ${icon}`);
	return path;
}

class StubIcon extends LitElement {
	static override properties = { icon: {} };
	declare icon?: string;

	static override styles = css`
		:host {
			display: var(--ha-icon-display, inline-flex);
			align-items: center;
			justify-content: center;
			position: relative;
			vertical-align: middle;
			fill: var(--icon-primary-color, currentcolor);
			width: var(--mdc-icon-size, 24px);
			height: var(--mdc-icon-size, 24px);
		}
		svg {
			width: 100%;
			height: 100%;
			display: block;
		}
	`;

	override render() {
		return this.icon
			? html`<svg viewBox="0 0 24 24">${svg`<path d=${iconPath(this.icon)}></path>`}</svg>`
			: html``;
	}
}

customElements.define("ha-card", StubCard);
customElements.define("ha-icon", StubIcon);
