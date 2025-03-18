import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SaveIcon from "@mui/icons-material/Save";

import { IconButton, Popover, PopoverProps, TextField, Tooltip } from "@mui/material";
import { useMemo, useState } from "react";
type LinkEditProps = {

    linkEl: HTMLAnchorElement
    setLinkEl: React.Dispatch<React.SetStateAction<null | HTMLAnchorElement>>;
    applyLink: (l: string) => void;
    container: PopoverProps["container"];
}
export const LinkEdit = ({ applyLink, linkEl, setLinkEl, container }: LinkEditProps) => {
    const [linkUrl, setLinkUrl] = useState(linkEl.href);

    const slotProps = useMemo(() => ({ popper: { container: container } }), [container]);

    return <Popover
        container={container}
        open={Boolean(linkEl)}
        anchorEl={linkEl}
        onClose={() => setLinkEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
    >
        <div style={{ padding: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
            <TextField
                variant="outlined"
                size="small"
                placeholder="Enter URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                autoFocus
                
            />
            <Tooltip title="Apply" slotProps={slotProps}>
                <IconButton onClick={() => applyLink(linkUrl)} size="small" color="primary" >
                    <SaveIcon />
                </IconButton>
            </Tooltip>
            {linkUrl && (
                <Tooltip title="Open Link" slotProps={slotProps}>
                    <IconButton size="small" color="secondary" onClick={() => window.open(linkUrl, "_blank")}>
                        <OpenInNewIcon />
                    </IconButton>
                </Tooltip>
            )}
            <Tooltip title="Discard" slotProps={slotProps}>
                <IconButton onClick={() => setLinkEl(null)} size="small">
                    <CloseIcon />
                </IconButton>
            </Tooltip>
        </div>
    </Popover >

}