import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SaveIcon from "@mui/icons-material/Save";

import { IconButton, Paper, TextField, Tooltip, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { useRichEditorUI } from "../RichEditorContext";
import * as styles from "../RichTextEditor.module.css";

export const LinkEdit = () => {

    const theme = useTheme();
    const { editor, setLinkEditPopupProps, linkEditPopupProps, portalContainerRef } = useRichEditorUI();
    const slotProps = { popper: { container: portalContainerRef.current } };
    const [linkUrl, setLinkUrl] = useState("");

    useEffect(() => {
        setLinkUrl(linkEditPopupProps?.href ?? "");
    }, [linkEditPopupProps?.href]);

    const applyLink = (href: string | undefined | null) => {
        linkEditPopupProps?.setHref(editor!, href ?? "");
        closeLinkEditor();
    };
    const openLink = () => {
        if (linkUrl) window.open(linkUrl, "_blank");
    };
    const closeLinkEditor = () => {
        setLinkEditPopupProps(null)
    }

    if (linkEditPopupProps === null || !editor) return null;

    return <Paper
        className={styles.floatingToolbar}
        elevation={4}
        style={{
            position: "absolute",
            top: `${linkEditPopupProps.popupPos.top}px`,
            left: `${linkEditPopupProps.popupPos.left}px`,
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
        }}
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
                    <IconButton size="small" color="secondary" onClick={openLink}>
                        <OpenInNewIcon />
                    </IconButton>
                </Tooltip>
            )}
            <Tooltip title="Discard" slotProps={slotProps}>
                <IconButton onClick={closeLinkEditor} size="small">
                    <CloseIcon />
                </IconButton>
            </Tooltip>
        </div>
    </Paper >

}