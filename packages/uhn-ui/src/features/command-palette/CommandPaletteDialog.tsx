import { Dialog, DialogContent } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CommandPaletteAutocomplete } from "./CommandPaletteAutocomplete";
import { QuickActionId } from "./commandPalette.types";

type CommandPaletteDialogProps = {
    open: boolean;
    onClose: () => void;
};

export const CommandPaletteDialog: React.FC<CommandPaletteDialogProps> = ({ open, onClose }) => {
    const portalContainer = usePortalContainerRef();
    const navigate = useNavigate();

    const handleLocationSelect = useCallback((locationId: string) => {
        navigate("/?scrollTo=" + encodeURIComponent(locationId));
        onClose();
    }, [navigate, onClose]);

    const handleSearchTermChange = useCallback((term: string) => {
        if (!term) return;
        navigate("/?filter=" + encodeURIComponent(term));
        onClose();
    }, [navigate, onClose]);

    const handleHighlightItem = useCallback((itemKey: string, locationId: string) => {
        const params = new URLSearchParams();
        params.set("highlight", itemKey);
        params.set("scrollTo", locationId);
        navigate("/?" + params.toString());
        onClose();
    }, [navigate, onClose]);

    const handleQuickAction = useCallback((action: QuickActionId) => {
        navigate("/?quick=" + encodeURIComponent(action));
        onClose();
    }, [navigate, onClose]);

    // Focus handling requires both `autoFocus` on the TextField and `onEntered` here.
    // `disableAutoFocus` prevents MUI's dialog-level focus trap from stealing focus to
    // the dialog container. `autoFocus` on the TextField ensures the input is marked for
    // focus on mount, and `onEntered` re-focuses after the transition animation completes
    // so the Autocomplete popper measures the correct layout dimensions.
    // Neither alone is sufficient — without autoFocus the input doesn't receive focus at
    // all; without onEntered the popper can misposition on first open.
    const handleTransitionEnd = useCallback(() => {
        const root = portalContainer.current?.getRootNode() as ShadowRoot | Document | undefined;
        const inputs = (root ?? document).querySelectorAll<HTMLInputElement>("[data-palette-input]");
        inputs[inputs.length - 1]?.focus();
    }, [portalContainer]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            container={portalContainer.current}
            maxWidth="sm"
            fullWidth
            disableAutoFocus
            slotProps={{
                transition: { onEntered: handleTransitionEnd },
                paper: {
                    sx: {
                        borderRadius: 3,
                        position: "fixed",
                        top: "15%",
                        m: 0,
                    },
                },
            }}
        >
            <DialogContent sx={{ py: 4, px: 2 }}>
                <CommandPaletteAutocomplete
                    autoFocus
                    onClose={onClose}
                    onLocationSelect={handleLocationSelect}
                    onSearchTermChange={handleSearchTermChange}
                    onHighlightItem={handleHighlightItem}
                    onQuickAction={handleQuickAction}
                />
            </DialogContent>
        </Dialog>
    );
};
