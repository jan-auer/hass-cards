// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installSelectOnFocus } from "./select-on-focus";

// Tapping an opted-in number field (e.g. a sprinkler run time) selects the whole value so typing overwrites
// it. Opt-in per field: only inputs whose shadow host sets `--select-on-focus: 1` (from the CCF entry's styles).
function field(optIn: boolean): HTMLInputElement {
	const host = document.createElement("div");
	if (optIn) host.style.setProperty("--select-on-focus", "1");
	const input = document.createElement("input");
	input.value = "23";
	host.attachShadow({ mode: "open" }).append(input);
	document.body.append(host);
	return input;
}

describe("installSelectOnFocus", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		vi.useRealTimers();
		document.body.replaceChildren();
	});

	it("selects the whole value of an opted-in field when it gets focus", () => {
		installSelectOnFocus(document);
		const input = field(true);
		input.focus();
		vi.runAllTimers();
		expect([input.selectionStart, input.selectionEnd]).toEqual([0, 2]);
	});

	// iOS focuses on touchend and then fires the synthetic mouse events, which put the caret back where the finger was.
	it("selects again when the tap that focused the field ends with a click", () => {
		installSelectOnFocus(document);
		const input = field(true);
		input.focus();
		vi.runAllTimers();
		input.setSelectionRange(1, 1); // the browser moves the caret to the tap position
		input.dispatchEvent(
			new MouseEvent("click", { bubbles: true, composed: true }),
		);
		vi.runAllTimers();
		expect([input.selectionStart, input.selectionEnd]).toEqual([0, 2]);
	});

	it("leaves other fields alone", () => {
		installSelectOnFocus(document);
		const input = field(false);
		input.focus();
		input.setSelectionRange(2, 2);
		vi.runAllTimers();
		expect([input.selectionStart, input.selectionEnd]).toEqual([2, 2]);
	});
});
