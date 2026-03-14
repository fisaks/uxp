import ClearIcon from "@mui/icons-material/Clear";
import { Box, Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { RuntimeResource } from "@uhn/common";
import React from "react";
import { RuleDetailPanel } from "./RuleDetailPanel";

type MobileResourceDialogProps = {
    open: boolean;
    onClose: () => void;
    container: HTMLElement | null;
    resourceAutocomplete: React.ReactNode;
    resourceIds: string[];
    hasSelection: boolean;
    onRemoveResource: (id: string) => void;
    onReorder: (orderedIds: string[]) => void;
    resourceById: Record<string, RuntimeResource>;
};

export const MobileResourceDialog: React.FC<MobileResourceDialogProps> = ({
    open,
    onClose,
    container,
    resourceAutocomplete,
    resourceIds,
    hasSelection,
    onRemoveResource,
    onReorder,
    resourceById,
}) => (
    <Dialog
        open={open}
        onClose={onClose}
        container={container}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { elevation: 0, variant: "outlined", sx: { borderRadius: 3 } } }}
        sx={{ display: { xs: "block", md: "none" } }}
    >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
            Resources
            <IconButton size="small" onClick={onClose}>
                <ClearIcon sx={{ color: "text.secondary" }} />
            </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 1, overflowX: "hidden" }}>
            <Box sx={{ mb: 2, px: 1 }}>
                {resourceAutocomplete}
            </Box>
            <RuleDetailPanel
                resourceIds={resourceIds}
                hasSelection={hasSelection}
                onRemoveResource={onRemoveResource}
                onReorder={onReorder}
                resourceById={resourceById}
            />
        </DialogContent>
    </Dialog>
);
