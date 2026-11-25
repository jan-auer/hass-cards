import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// README screenshots (`npm run screenshots`): the cards with demo data in WebKit, written to images/.
// Kept out of vitest.config.ts so `npm test` never runs them.
export default defineConfig({
	test: {
		name: "screenshots",
		include: ["screenshots/**/*.screenshot.ts"],
		browser: {
			enabled: true,
			provider: playwright({
				contextOptions: {
					deviceScaleFactor: 2,
					locale: "de-AT",
					timezoneId: "Europe/Vienna",
				},
			}),
			headless: true,
			viewport: { width: 480, height: 1000 },
			instances: [{ browser: "webkit" }],
		},
	},
});
