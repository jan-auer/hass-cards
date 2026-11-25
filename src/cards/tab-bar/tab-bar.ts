import { css, html, LitElement, nothing } from "lit";
import { fireHassAction } from "../../ha/actions";
import { registerCard } from "../../ha/register";
import { NEUTRAL_TRACK, reflectDarkMode } from "../../ha/theme";
import type { HomeAssistant, LovelaceCardConfig } from "../../ha/types";
import { findActiveTab, resolveTabPath } from "./active-tab";
import {
	configForm,
	normalizeConfig,
	type TabBarConfig,
	type TabConfig,
} from "./config";

/**
 * Floating glass tab bar for a view's `footer`. Icons only; the active tab follows the URL.
 *
 *   footer:
 *     card:
 *       type: custom:floating-tab-bar
 *       parent_tab: raeume   # on subpages only
 */
export class FloatingTabBar extends LitElement {
	static override properties = {
		_config: { state: true },
		_currentPath: { state: true },
	};

	declare _config?: TabBarConfig;
	declare _currentPath: string;

	private _hass?: HomeAssistant;

	/**
	 * Not reactive on purpose: the bar shows no entity state, so `hass` updates never re-render it.
	 * Only the theme's dark mode is read, as an attribute the styles switch on.
	 */
	set hass(hass: HomeAssistant | undefined) {
		this._hass = hass;
		reflectDarkMode(this, hass);
	}

	get hass(): HomeAssistant | undefined {
		return this._hass;
	}

	constructor() {
		super();
		this._currentPath = location.pathname;
	}

	static getConfigForm() {
		return configForm;
	}

	static getStubConfig(): Partial<TabBarConfig> {
		return {
			tabs: [
				{
					path: "home",
					icon: "mdi:home-outline",
					active_icon: "mdi:home",
					label: "Home",
				},
				{ path: "wetter", icon: "mdi:weather-partly-cloudy", label: "Wetter" },
			],
		};
	}

	setConfig(config: LovelaceCardConfig): void {
		this._config = normalizeConfig(config);
	}

	getCardSize(): number {
		return 1;
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this._currentPath = location.pathname;
		window.addEventListener("location-changed", this._onLocationChanged);
		window.addEventListener("popstate", this._onLocationChanged);
		window.addEventListener("resize", this._centerOverPlaceholder);
		this._resizeObserver.observe(this);
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		window.removeEventListener("location-changed", this._onLocationChanged);
		window.removeEventListener("popstate", this._onLocationChanged);
		window.removeEventListener("resize", this._centerOverPlaceholder);
		this._resizeObserver.disconnect();
	}

	/** The fixed bar follows its placeholder horizontally (matters next to HA's sidebar on desktop). */
	private readonly _centerOverPlaceholder = (): void => {
		const { left, width } = this.getBoundingClientRect();
		if (width > 0)
			this.style.setProperty("--_center-x", `${left + width / 2}px`);
	};

	private readonly _resizeObserver = new ResizeObserver(
		this._centerOverPlaceholder,
	);

	private readonly _onLocationChanged = (): void => {
		this._currentPath = location.pathname;
	};

	private _onTabClick(tab: TabConfig): void {
		const target = resolveTabPath(tab.path, location.pathname);
		if (target === resolveTabPath(location.pathname, location.pathname)) return;
		fireHassAction(this, { action: "navigate", navigation_path: target });
	}

	override render() {
		if (!this._config) return nothing;
		const { tabs, parent_tab } = this._config;
		const active = findActiveTab(tabs, this._currentPath, parent_tab);
		return html`
      <nav aria-label="Tabs">
        ${tabs.map((tab, index) => {
					const isActive = index === active;
					return html`
            <button
              type="button"
              class=${isActive ? "active" : ""}
              aria-label=${tab.label}
              title=${tab.label}
              aria-current=${isActive ? "page" : nothing}
              @click=${() => this._onTabClick(tab)}
            >
              <ha-icon icon=${isActive ? (tab.active_icon ?? tab.icon) : tab.icon}></ha-icon>
            </button>
          `;
				})}
      </nav>
    `;
	}

	// Floating glass. Themes have no tab-bar tokens, and HA's footer replaces --ha-card-box-shadow with its
	// own heavy shadow, so the bar's own values are the defaults here; a theme can override each one with the
	// --floating-tab-bar-* variables. Light/dark follows hass.themes.darkMode (the `dark` attribute).
	static override styles = css`
    :host {
      --_background: linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.14));
      --_border-color: rgba(255, 255, 255, 0.7);
      --_box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 8px 26px rgba(20, 30, 60, 0.12);
      --_backdrop-filter: blur(12px) saturate(200%);
      --_active-background: ${NEUTRAL_TRACK};
      /* The host stays in HA's footer as a placeholder of the bar's height, so the footer keeps
         reserving the space and the page's last card ends above the bar. */
      display: block;
      height: calc(42px + 2 * 6px + 2px);
    }
    :host([dark]) {
      --_background: rgba(24, 24, 30, 0.55);
      --_border-color: rgba(255, 255, 255, 0.08);
      --_box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 26px rgba(0, 0, 0, 0.5);
      --_backdrop-filter: blur(12px) saturate(140%);
    }
    /*
     * The bar's bottom edge sits 22 px above the screen edge, the same on every page. HA's footer
     * can't give that: on a phone it sits 24 px up while it sticks (long pages) but 34 px up (the
     * safe-area padding of the view container) on short pages and at the end of long ones. So the
     * bar is fixed to the screen, centred over its placeholder (--_center-x, measured on resize).
     */
    nav {
      position: fixed;
      bottom: var(--floating-tab-bar-bottom, 22px);
      left: var(--_center-x, 50%);
      transform: translateX(-50%);
      display: flex;
      gap: 4px;
      padding: 6px;
      border-radius: var(--ha-border-radius-pill, 9999px);
      background: var(--floating-tab-bar-background, var(--_background));
      border: 1px solid var(--floating-tab-bar-border-color, var(--_border-color));
      box-shadow: var(--floating-tab-bar-box-shadow, var(--_box-shadow));
      -webkit-backdrop-filter: var(--floating-tab-bar-backdrop-filter, var(--_backdrop-filter));
      backdrop-filter: var(--floating-tab-bar-backdrop-filter, var(--_backdrop-filter));
    }
    button {
      appearance: none;
      display: grid;
      place-items: center;
      width: 52px;
      height: 42px;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: var(--ha-border-radius-pill, 9999px);
      background: transparent;
      color: rgba(var(--rgb-secondary-text-color, 60, 60, 67), 0.5);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition:
        background-color var(--ha-animation-duration-fast, 200ms) ease,
        color var(--ha-animation-duration-fast, 200ms) ease;
    }
    button.active {
      background: var(--floating-tab-bar-active-background, var(--_active-background));
      color: var(--accent-color, var(--primary-color));
    }
    button:focus-visible {
      outline: 2px solid var(--accent-color, var(--primary-color));
      outline-offset: 2px;
    }
    ha-icon {
      --mdc-icon-size: 24px;
    }
  `;
}

registerCard("floating-tab-bar", FloatingTabBar, {
	documentation: "tab-bar",
	name: "Schwebende Tab-Leiste",
	description: "Schwebende Tab-Leiste für die Fußzeile einer Ansicht",
	preview: true,
});
