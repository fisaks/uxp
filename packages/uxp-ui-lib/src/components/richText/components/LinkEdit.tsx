import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SaveIcon from "@mui/icons-material/Save";

import { IconButton, Popover, TextField, Tooltip } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRichEditorUI } from "../RichEditorContext";

export const LinkEdit = () => {


    const { editor, linkTagToEdit, setLinkTagToEdit, portalContainerRef, linkEditPopupPos, setLinkEditPopupPos } = useRichEditorUI();
    const slotProps = useMemo(() => ({ popper: { container: portalContainerRef.current } }), [portalContainerRef.current]);
    const [linkUrl, setLinkUrl] = useState("");

    useEffect(() => {
        setLinkUrl(linkTagToEdit?.href ?? "");
    }, [linkTagToEdit]);

    useEffect(() => {
        setLinkUrl(editor?.getAttributes("image").href ?? "");
    }, [linkEditPopupPos]);
    const open = useMemo(() => Boolean(linkTagToEdit) || !!linkEditPopupPos, [linkTagToEdit, linkEditPopupPos])

    const applyLink = useCallback((href: string | undefined | null) => {
        if (!!linkEditPopupPos) {
            editor?.commands.setImageLink(href as string | null);
        }
        else if (href && href.trim()) {
            editor?.chain().focus().extendMarkRange('link').setLink({ href }).run()
        }
        setLinkTagToEdit(null);
        setLinkEditPopupPos(null);
    }, [editor, linkEditPopupPos]);
    const cancel = () => {
        setLinkTagToEdit(null)
        setLinkEditPopupPos(null);
    }

    return <Popover
        container={portalContainerRef.current}
        open={open}
        anchorEl={linkTagToEdit ?? undefined}
        onClose={() => setLinkTagToEdit(null)}
        anchorReference={linkEditPopupPos ? "anchorPosition" : "anchorEl"}
        anchorPosition={linkEditPopupPos ? { top: linkEditPopupPos.top, left: linkEditPopupPos.left } : undefined}
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
                <IconButton onClick={cancel} size="small">
                    <CloseIcon />
                </IconButton>
            </Tooltip>
        </div>
    </Popover >

}