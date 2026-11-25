// HA's battery glyph and colour (frontend 20261028.6: src/common/entity/battery_icon.ts and
// color/battery_color.ts), so the widget's battery looks like every other battery icon in HA.

/** The MDI battery for a level in steps of 10; the charging variant while charging. */
export function batteryIcon(level: number, charging: boolean): string {
	const step = Math.round(level / 10) * 10;
	if (charging)
		return level >= 10
			? `mdi:battery-charging-${step}`
			: "mdi:battery-charging-outline";
	if (level <= 5) return "mdi:battery-alert-variant-outline";
	return step >= 100 ? "mdi:battery" : `mdi:battery-${step}`;
}

/** HA's battery state colour: high from 70 %, medium from 30 %, low below (theme variables). */
export function batteryColor(level: number): string {
	if (level >= 70)
		return "var(--state-sensor-battery-high-color, var(--green-color, #4caf50))";
	if (level >= 30)
		return "var(--state-sensor-battery-medium-color, var(--orange-color, #ff9800))";
	return "var(--state-sensor-battery-low-color, var(--red-color, #f44336))";
}
