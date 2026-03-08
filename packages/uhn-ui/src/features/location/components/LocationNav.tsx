import { Chip, Stack } from "@mui/material";
import { RuntimeLocation } from "@uhn/common";
import React from "react";
import { getBlueprintIcon } from "../../view/blueprintIconMap";

type LocationNavProps = {
    locations: RuntimeLocation[];
    selectedId: string | undefined;
    onSelect: (locationId: string) => void;
};

export const LocationNav: React.FC<LocationNavProps> = ({ locations, selectedId, onSelect }) => {
    return (
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, mb: 2 }}>
            {locations.map(loc => {
                const isSelected = loc.id === selectedId;
                const iconEntry = loc.icon ? getBlueprintIcon(loc.icon) : undefined;
                const IconComponent = iconEntry?.active;
                return (
                    <Chip
                        key={loc.id}
                        label={loc.name ?? loc.id}
                        icon={IconComponent ? <IconComponent fontSize="small" /> : undefined}
                        variant={isSelected ? "filled" : "outlined"}
                        color={isSelected ? "primary" : "default"}
                        onClick={() => onSelect(loc.id)}
                    />
                );
            })}
        </Stack>
    );
};
