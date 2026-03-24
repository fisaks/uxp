import { Box, Button, Popover, Typography } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React from "react";
import { TileRuntimeResource } from "../resource-ui.type";
import { useSendResourceCommand } from "../hooks/useSendResourceCommand";

type ActionInputPanelProps = {
    resource: TileRuntimeResource;
    anchorEl: HTMLElement | null;
    onClose: () => void;
};

/** Popover for actionInput resource tiles. Shows a button for each available action. */
export const ActionInputPanel: React.FC<ActionInputPanelProps> = ({
    resource,
    anchorEl,
    onClose,
}) => {
    const portalContainer = usePortalContainerRef();
    const sendCommand = useSendResourceCommand(resource.id);

    const actions = resource.actions ?? [];

    const handleAction = (action: string) => {
        sendCommand({ type: "action", action });
    };

    return (
        <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={onClose}
            container={portalContainer.current}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
        >
            <Box sx={{ p: 1.5, minWidth: 160, maxWidth: 280 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, px: 0.5 }}>
                    {resource.name}
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {actions.map((action) => (
                        <Button
                            key={action}
                            size="small"
                            variant="outlined"
                            onClick={() => handleAction(action)}
                            sx={{
                                textTransform: "none",
                                fontFamily: "monospace",
                                fontSize: "0.75rem",
                                justifyContent: "flex-start",
                            }}
                        >
                            {action}
                        </Button>
                    ))}
                    {actions.length === 0 && (
                        <Typography variant="body2" color="text.secondary">No actions available</Typography>
                    )}
                </Box>
            </Box>
        </Popover>
    );
};
