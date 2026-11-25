import { describe, expect, it } from "vitest";
import { beaufort, cardinal, kmh } from "./wind";

describe("cardinal", () => {
	it("names the 8-point German direction", () => {
		expect(cardinal(0)).toBe("N");
		expect(cardinal(130)).toBe("SO");
		expect(cardinal(126)).toBe("SO");
		expect(cardinal(90)).toBe("O");
		expect(cardinal(225)).toBe("SW");
		expect(cardinal(292)).toBe("W");
		expect(cardinal(338)).toBe("N");
		expect(cardinal(360)).toBe("N");
	});
});

describe("beaufort", () => {
	it("maps km/h to the DWD scale with short German words", () => {
		expect(beaufort(0)).toEqual({ force: 0, word: "still" });
		expect(beaufort(15)).toEqual({ force: 3, word: "schwach" });
		expect(beaufort(19.7)).toEqual({ force: 3, word: "schwach" });
		expect(beaufort(19.9)).toEqual({ force: 4, word: "mäßig" });
		expect(beaufort(80)).toEqual({ force: 9, word: "Sturm" });
		expect(beaufort(130)).toEqual({ force: 12, word: "Orkan" });
	});
});

describe("kmh", () => {
	it("converts the sensor's unit to km/h", () => {
		expect(kmh(15, "km/h")).toBe(15);
		expect(kmh(10, "m/s")).toBe(36);
		expect(kmh(10, "kn")).toBeCloseTo(18.52);
		expect(kmh(10, undefined)).toBe(10);
	});
});
