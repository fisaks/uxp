import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import { SvgIconProps } from "@mui/material";
import { getBlueprintIcon } from "../../view/blueprintIconMap";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";

export function getResourceIcon(
    resource: TileRuntimeResource,
    state?: TileRuntimeResourceState,
): React.ComponentType<SvgIconProps> {
    const entry = resource.icon ? getBlueprintIcon(resource.icon) : undefined;
    if (!entry) return DeviceHubIcon;
    if (!entry.inactive) return entry.active;
    const active = Boolean(state?.value);
    return active ? entry.active : entry.inactive;
}
