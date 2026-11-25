import { css, svg, type TemplateResult } from "lit";
import { WEATHER_PATHS } from "./icon-paths";

type PathName = keyof typeof WEATHER_PATHS;

/** German words for HA's weather conditions. */
export const CONDITION_WORDS: Record<string, string> = {
	"clear-night": "Klar",
	sunny: "Sonnig",
	partlycloudy: "Teilweise bewölkt",
	cloudy: "Bewölkt",
	fog: "Nebel",
	hail: "Hagel",
	lightning: "Gewitter",
	"lightning-rainy": "Gewitter",
	pouring: "Starkregen",
	rainy: "Regen",
	snowy: "Schnee",
	"snowy-rainy": "Schneeregen",
	windy: "Windig",
	"windy-variant": "Windig",
	exceptional: "Unwetter",
};

const CLOUDS: PathName[] = ["cloudBack", "cloudFront"];
const CLOUDY = new Set([
	"partlycloudy",
	"cloudy",
	"fog",
	"windy",
	"windy-variant",
	"hail",
	"rainy",
	"snowy",
	"snowy-rainy",
	"pouring",
	"lightning",
	"lightning-rainy",
]);

/** Which of HA's icon parts make up a condition (the same composition as HA's own weather icons). */
function parts(condition: string, night: boolean): PathName[] {
	const out: PathName[] = [];
	if (condition === "sunny") out.push("sun");
	if (condition === "clear-night") out.push("moon");
	if (condition === "partlycloudy") out.push(night ? "moonSmall" : "sunSmall");
	if (CLOUDY.has(condition)) out.push(...CLOUDS);
	if (condition === "fog") out.push("fogLower", "fogUpper");
	if (["rainy", "hail", "lightning-rainy", "snowy-rainy"].includes(condition))
		out.push("rain1", "rain2", "rain3", "rain4");
	if (condition === "pouring")
		out.push("rain1", "rain2", "rain3", "rain4", "rain5", "rain6");
	if (condition === "snowy" || condition === "snowy-rainy")
		out.push("snow1", "snow2", "snow3");
	if (condition === "lightning" || condition === "lightning-rainy")
		out.push("lightning");
	return out;
}

/** HA's colour weather icon as inline SVG; colours come from the `.weather-icon` styles of the card. */
export function weatherIcon(
	condition: string,
	night: boolean,
	size: number,
): TemplateResult {
	return svg`<svg class="weather-icon" viewBox="0 0 17 17" width=${size} height=${size} aria-hidden="true">
		${parts(condition, night).map((name) => svg`<path class=${WEATHER_PATHS[name].kind} d=${WEATHER_PATHS[name].d}></path>`)}
	</svg>`;
}

/** HA's default weather icon colours (themes rarely set --weather-icon-* tokens), for `weatherIcon()`. */
export const weatherIconStyles = css`
	.weather-icon {
		display: block;
		flex: none;
	}
	.weather-icon .sun {
		fill: #fdd93c;
	}
	.weather-icon .moon {
		fill: #fcf497;
	}
	.weather-icon .cloud-back {
		fill: #d4d4d4;
	}
	.weather-icon .cloud-front {
		fill: #f9f9f9;
	}
	.weather-icon .rain {
		fill: #30b3ff;
	}
	.weather-icon .snow {
		fill: #f9f9f9;
		stroke: #d4d4d4;
		stroke-width: 1;
		paint-order: stroke;
	}
`;
