// One bundle with all cards; each module registers its own element.
import "./cards/tab-bar/tab-bar";
import "./cards/weather/weather";
import "./features/room-controls/room-controls";
import "./cards/room-tile/room-tile";
import "./cards/filter/filter-bar";
import "./cards/filter/filter-section";
import "./cards/vacuum-tile/vacuum-tile";
import "./cards/level/level";
import "./cards/forecast-days/forecast-days";
import "./cards/rain/rain";
import "./cards/wind/wind-card";
import "./cards/upcoming-pickups/upcoming-pickups";
import { installSelectOnFocus } from "./behaviours/select-on-focus";

installSelectOnFocus(document);
