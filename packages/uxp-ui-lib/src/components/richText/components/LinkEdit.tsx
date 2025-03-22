import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SaveIcon from "@mui/icons-material/Save";

import { IconButton, Paper, TextField, Tooltip, useTheme } from "@mui/material";
import { useEffect, useLayoutEffect, useState } from "react";
import { useRichEditorUI } from "../RichEditorContext";
import * as styles from "../RichTextEditor.module.css";

export const LinkEdit = () => {

    const theme = useTheme();
    const { editor, setLinkEditPopupProps, linkEditPopupProps, portalContainerRef ,editorRootContainerRef} = useRichEditorUI();
    const slotProps = { popper: { container: portalContainerRef.current } };
    const [linkUrl, setLinkUrl] = useState("");
    const [adjustedLeft, setAdjustedLeft] = useState<number | null>(null);


    useEffect(() => {
        setLinkUrl(linkEditPopupProps?.href ?? "");
    }, [linkEditPopupProps?.href]);

    useLayoutEffect(() => {
        if (!linkEditPopupProps || !editorRootContainerRef.current) return;
        const containerRect = editorRootContainerRef.current.getBoundingClientRect();
        const containerWidth=containerRect.width;

        const originalLeft = linkEditPopupProps.popupPos.left;
        const popupMaxWidth = 380;
        
        const overflow = (originalLeft + popupMaxWidth) - containerWidth;

        if (overflow > 0) {
            setAdjustedLeft(Math.max(originalLeft - overflow, 0));
        } else {
            setAdjustedLeft(originalLeft);
        }
    }, [linkEditPopupProps,editorRootContainerRef]);

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
            left: adjustedLeft !== null ? `${adjustedLeft}px` : "-9999px",
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