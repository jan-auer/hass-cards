import type { TabConfig } from "./config";

function withoutTrailingSlash(path: string): string {
	return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/** The URL path a tab points to. Relative tab paths live in the dashboard of `currentPath`. */
export function resolveTabPath(tabPath: string, currentPath: string): string {
	const path = withoutTrailingSlash(tabPath.split(/[?#]/)[0]);
	if (path.startsWith("/")) return path;
	const dashboard = currentPath.split("/")[1] ?? "";
	return `/${dashboard}/${path}`;
}

/**
 * Index of the tab to highlight, or -1.
 * 1. The tab whose path is the current view.
 * 2. On the dashboard root (no view in the URL): the first tab, since HA opens the first view there.
 * 3. On a subpage: the tab named by `parentTab`.
 */
export function findActiveTab(
	tabs: readonly TabConfig[],
	currentPath: string,
	parentTab?: string,
): number {
	const current = withoutTrailingSlash(currentPath);
	const resolved = tabs.map((tab) => resolveTabPath(tab.path, current));

	const exact = resolved.indexOf(current);
	if (exact !== -1) return exact;

	const isDashboardRoot = current.split("/").length === 2;
	if (isDashboardRoot && tabs.length > 0) return 0;

	return parentTab ? resolved.indexOf(resolveTabPath(parentTab, current)) : -1;
}
