/**
 * The selected value per filter group: in memory only, so it never leaks between
 * users, devices or browser tabs, and nothing is written to HA or browser storage.
 *
 * Every visit to a page starts at the bar's default (nothing selected). HA keeps a dashboard's view elements cached
 * between visits (frontend 20261028.6: hui-root.ts `_viewCache`), so the cards survive and the reset
 * has to come from navigation: a new pathname is a new visit. HA's `navigate()` fires `location-changed`
 * on window after `pushState`/`replaceState` (src/common/navigate.ts), the browser fires `popstate` for
 * back and forward. Only the hash or the query changing (Bubble Card pop-ups, the media sheet, `?edit=1`)
 * keeps the selection.
 */
export class FilterStore {
	private readonly _default = new Map<string, string>();
	private readonly _selected = new Map<string, string>();
	private readonly _events = new EventTarget();
	private _path: string;

	constructor(path: string) {
		this._path = path;
	}

	/** The selected value, else the bar's default; undefined while no bar has registered the group. */
	value(group: string): string | undefined {
		return this._selected.get(group) ?? this._default.get(group);
	}

	/** Whether a pill is selected (false while the default applies). */
	isSelected(group: string): boolean {
		return this._selected.has(group);
	}

	/** The bar's default: the value of every new visit and after `clear`. */
	setDefault(group: string, value: string): void {
		if (this._default.get(group) === value) return;
		this._default.set(group, value);
		if (!this._selected.has(group)) this._notify(group);
	}

	/** Back to the default (tapping the selected pill again). */
	clear(group: string): void {
		// Always notify: even when the value stays the same, the bar un-highlights the pill.
		if (this._selected.delete(group)) this._notify(group);
	}

	select(group: string, value: string): void {
		const changed = this._selected.get(group) !== value;
		this._selected.set(group, value);
		if (changed) this._notify(group);
	}

	/** Called with the current pathname on every navigation; a new pathname resets every group. */
	visit(path: string): void {
		if (path === this._path) return;
		this._path = path;
		if (this._selected.size === 0) return;
		const groups = [...this._selected.keys()];
		this._selected.clear();
		for (const group of groups) this._notify(group);
	}

	/** Calls `callback` whenever the value of `group` changes; returns the unsubscribe function. */
	subscribe(group: string, callback: () => void): () => void {
		const listener = (event: Event) => {
			if ((event as CustomEvent<string>).detail === group) callback();
		};
		this._events.addEventListener("change", listener);
		return () => this._events.removeEventListener("change", listener);
	}

	private _notify(group: string): void {
		this._events.dispatchEvent(new CustomEvent("change", { detail: group }));
	}
}

/** The one store of this bundle; bars and sections of the same `group` meet here. */
export const filterStore = new FilterStore(location.pathname);

const onNavigation = () => filterStore.visit(location.pathname);
window.addEventListener("location-changed", onNavigation);
window.addEventListener("popstate", onNavigation);
