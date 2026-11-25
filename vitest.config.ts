import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Logic tests run in jsdom; render tests (*.browser.test.ts) mount the real card in WebKit,
// the engine of every iOS device.
export default defineConfig({
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					environment: "jsdom",
					include: ["src/**/*.test.ts"],
					exclude: ["src/**/*.browser.test.ts"],
				},
			},
			{
				extends: true,
				test: {
					name: "browser",
					include: ["src/**/*.browser.test.ts"],
					browser: {
						enabled: true,
						// The fixtures' dates are written for Central European time; pin it so CI (UTC) agrees.
						provider: playwright({
							contextOptions: { timezoneId: "Europe/Vienna" },
						}),
						headless: true,
						instances: [{ browser: "webkit" }],
					},
				},
			},
		],
	},
});
