#!/usr/bin/env node
// README images for the cards that need HA's own elements (room tile, vacuum): cropped from the
// live dashboard in WebKit, light and dark. Room photos (HA's area pictures and /local photos) are swapped for
// drawn stand-ins on the way in, and every other card is hidden, so no real room shows up in the public repo. Credentials: HA_URL and HA_TOKEN from the environment or a .env file (HA_ENV_FILE).

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { webkit } from "playwright";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(REPO_ROOT, "images");
const PADDING = 16;

/** The shots: dashboard path, element (Playwright CSS, pierces shadow roots), its index, image name. */
const SHOTS = [
	["/lovelace/home", "room-tile-card", 0, "room-tile"],
	["/lovelace/raeume", "room-tile-card", 3, "room-tile-inline"],
	["/lovelace/home", "vacuum-tile-card ha-card", 0, "vacuum-tile"],
];

function credentials() {
	const envFile = process.env.HA_ENV_FILE ?? join(REPO_ROOT, ".env");
	const fromFile = {};
	if (existsSync(envFile)) {
		for (const line of readFileSync(envFile, "utf8").split("\n")) {
			const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
			if (match) fromFile[match[1]] = match[2];
		}
	}
	const url = process.env.HA_URL ?? fromFile.HA_URL;
	const token = process.env.HA_TOKEN ?? fromFile.HA_TOKEN;
	if (!url || !token)
		throw new Error(
			`HA_URL and HA_TOKEN must be set (environment or ${envFile})`,
		);
	return { url, token };
}

/** A simple drawn room (wall, window, floor, sofa) in one hue per photo, so tiles still differ. */
function standInRoom(path) {
	let hash = 0;
	for (const char of path) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	const hue = hash % 360;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
	<defs><linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
		<stop offset="0" stop-color="hsl(${hue} 30% 88%)"/><stop offset="1" stop-color="hsl(${hue} 25% 78%)"/>
	</linearGradient></defs>
	<rect width="120" height="120" fill="url(#wall)"/>
	<rect x="62" y="18" width="40" height="46" rx="2" fill="hsl(200 60% 86%)" stroke="hsl(${hue} 15% 96%)" stroke-width="3"/>
	<rect y="84" width="120" height="36" fill="hsl(${(hue + 30) % 360} 25% 62%)"/>
	<rect x="10" y="66" width="56" height="26" rx="6" fill="hsl(${hue} 35% 48%)"/>
	<rect x="14" y="58" width="48" height="14" rx="5" fill="hsl(${hue} 35% 56%)"/>
</svg>`;
}

async function main() {
	const { url, token } = credentials();
	const tokens = JSON.stringify({
		access_token: token,
		token_type: "Bearer",
		expires_in: 1e9,
		hassUrl: url,
		clientId: `${url}/`,
		expires: Date.now() + 1e12,
		refresh_token: "",
	});
	mkdirSync(OUT_DIR, { recursive: true });
	const browser = await webkit.launch();
	try {
		for (const mode of ["light", "dark"]) {
			const page = await browser.newPage({
				viewport: { width: 400, height: 900 },
				deviceScaleFactor: 2,
				colorScheme: mode,
			});
			await page.addInitScript(
				([stored, dark]) => {
					localStorage.setItem("hassTokens", stored);
					// No theme name: HA keeps its default theme and only switches between light and dark.
					localStorage.setItem("selectedTheme", JSON.stringify({ dark }));
				},
				[tokens, mode === "dark"],
			);
			await page.route(
				/\/api\/image\/serve\/|\/local\/.*rooms\/.*\.(jpe?g|png|webp)/i,
				(route) =>
					route.fulfill({
						contentType: "image/svg+xml",
						body: standInRoom(new URL(route.request().url()).pathname),
					}),
			);
			for (const [path, selector, index, name] of SHOTS) {
				await page.goto(url + path);
				await page.waitForTimeout(5000);
				// Only the shot's card stays visible, so the padding shows the view's background.
				await page.locator("floating-tab-bar").evaluateAll((bars) => {
					for (const bar of bars) bar.style.display = "none";
				});
				const element = page.locator(selector).nth(index);
				await element.evaluate((shot) => {
					// Hide the siblings at every level up the composed tree: the layout stays, only the shot shows.
					for (
						let at = shot;
						at?.parentNode;
						at = at.parentNode.host ?? at.parentNode
					) {
						for (const sibling of at.parentNode.children ?? [])
							if (sibling !== at && sibling instanceof HTMLElement)
								sibling.style.opacity = "0";
					}
				});
				await element.scrollIntoViewIfNeeded();
				const box = await element.boundingBox();
				if (!box)
					throw new Error(`${name}: ${selector} #${index} isn't visible`);
				const file = join(OUT_DIR, `${name}-${mode}.png`);
				await page.screenshot({
					path: file,
					clip: {
						x: Math.max(0, box.x - PADDING),
						y: Math.max(0, box.y - PADDING),
						width: box.width + 2 * PADDING,
						height: box.height + 2 * PADDING,
					},
				});
				console.log(file);
			}
			await page.close();
		}
	} finally {
		await browser.close();
	}
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
