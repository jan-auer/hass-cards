import { defineConfig } from "vite";

export default defineConfig({
	build: {
		target: "safari15.4", // HA's legacy floor (iOS 15.4+)
		outDir: "dist",
		minify: "oxc",
		// Vite keeps whitespace in ES library builds (to preserve pure annotations for downstream
		// bundlers); this bundle is the final file HA loads, so let the minifier print it compactly.
		rolldownOptions: { output: { minify: { codegen: true } } },
		lib: {
			entry: "src/index.ts",
			formats: ["es"],
			fileName: () => "hass-cards.js",
		},
	},
});
