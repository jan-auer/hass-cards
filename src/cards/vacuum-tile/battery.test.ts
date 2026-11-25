import { describe, expect, it } from "vitest";
import { batteryColor, batteryIcon } from "./battery";

describe("batteryIcon", () => {
	it("follows the level in steps of 10, like HA's battery icon", () => {
		expect(batteryIcon(100, false)).toBe("mdi:battery");
		expect(batteryIcon(64, false)).toBe("mdi:battery-60");
		expect(batteryIcon(18, false)).toBe("mdi:battery-20");
		expect(batteryIcon(4, false)).toBe("mdi:battery-alert-variant-outline");
	});

	it("uses the charging variants while charging", () => {
		expect(batteryIcon(100, true)).toBe("mdi:battery-charging-100");
		expect(batteryIcon(45, true)).toBe("mdi:battery-charging-50");
		expect(batteryIcon(6, true)).toBe("mdi:battery-charging-outline");
	});
});

describe("batteryColor", () => {
	it("uses HA's battery colours: high from 70 %, medium from 30 %, low below", () => {
		expect(batteryColor(70)).toContain("--state-sensor-battery-high-color");
		expect(batteryColor(30)).toContain("--state-sensor-battery-medium-color");
		expect(batteryColor(29)).toContain("--state-sensor-battery-low-color");
	});
});
