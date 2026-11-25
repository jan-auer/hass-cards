// Select the whole value when an opted-in text field gets focus, so typing overwrites it (e.g. a
// sprinkler run-time number on custom-card-features' `input` entry). CCF has no such option and its styles can't run
// code, so document-level listeners do it. Opt-in: the field's shadow host sets `--select-on-focus: 1`
// (e.g. `:host { --select-on-focus: 1; }` in the CCF entry's `styles`); every other field is left alone.
//
// iOS focuses the field on touchend and fires the synthetic mouseup/click afterwards, which put the caret back at
// the tap position; so the tap that focused the field selects again on its mouseup/click (and the mouseup's default
// caret placement is prevented).

const OPT_IN = "--select-on-focus";
const TAP_WINDOW_MS = 1000;
const installed = new WeakSet<Document>();

function optedIn(input: HTMLInputElement): boolean {
	const root = input.getRootNode();
	const host = root instanceof ShadowRoot ? root.host : input;
	return getComputedStyle(host).getPropertyValue(OPT_IN).trim() === "1";
}

const selectAll = (input: HTMLInputElement) =>
	setTimeout(() => input.setSelectionRange(0, input.value.length), 0);

export function installSelectOnFocus(doc: Document): void {
	if (installed.has(doc)) return;
	installed.add(doc);
	let focused: { input: HTMLInputElement; at: number } | undefined;
	const inputOf = (event: Event) => {
		const target = event.composedPath()[0];
		return target instanceof HTMLInputElement && optedIn(target)
			? target
			: undefined;
	};
	doc.addEventListener("focusin", (event) => {
		const input = inputOf(event);
		if (!input) return;
		focused = { input, at: Date.now() };
		selectAll(input);
	});
	const reselect = (event: Event) => {
		const input = inputOf(event);
		if (
			!input ||
			focused?.input !== input ||
			Date.now() - focused.at > TAP_WINDOW_MS
		)
			return;
		if (event.type === "mouseup") event.preventDefault();
		selectAll(input);
	};
	doc.addEventListener("mouseup", reselect, true);
	doc.addEventListener("click", reselect, true);
}
