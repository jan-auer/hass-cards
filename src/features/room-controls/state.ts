import { stateColorCss } from "../../ha/state-color";
import type { HassEntity } from "../../ha/types";

/** The on colour: HA's state colour cascade. */
export function activeColorCss(entity: HassEntity): string {
	return stateColorCss(entity) ?? "var(--state-active-color)";
}
