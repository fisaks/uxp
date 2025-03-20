import FormatAlignJustify from "@mui/icons-material/FormatAlignJustify";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";

import { IconButton, Paper, Tooltip, useTheme } from "@mui/material";
import React from "react";
import { useRichEditorUI } from "../RichEditorContext";
import * as styles from "../RichTextEditor.module.css";


export const FloatingImageToolbar = () => {
    const theme = useTheme();
    const { editor, imageToolbarPos, setLinkEditPopupProps, editorRootContainerRef, setImageToolbarPos, portalContainerRef } = useRichEditorUI();


    if (!editor || !imageToolbarPos) return null;

    const slotProps = { popper: { container: portalContainerRef.current } };
    const imageLink = editor?.getAttributes("image").href ?? null;
    const hideFloatingToolbar = () => {
        setImageToolbarPos(null)
    }

    const setFloatingMode = (float: String) => {
        editor.chain().focus().updateAttributes("image", { float }).run();
        hideFloatingToolbar();
    };


    const showLinkEditPopup = (_event: React.MouseEvent<HTMLElement>) => {

        setLinkEditPopupProps({
            href: imageLink,
            popupPos: imageToolbarPos,
            setHref: (editorArg, href) => {
                editorArg.commands.setImageLink(href);
            }
        });
        hideFloatingToolbar();

    };
    const removeLinkFromImage = (_event: React.MouseEvent<HTMLElement>) => {
        hideFloatingToolbar();
        editor.commands.setImageLink(null);
    };

    return (
        <Paper
            className={styles.floatingToolbar}
            elevation={4} // Slight shadow for better visibility
            style={{
                position: "absolute",
                top: `${imageToolbarPos.top}px`,
                left: `${imageToolbarPos.left}px`,
                backgroundColor: theme.palette.background.default, // Use theme background
                color: theme.palette.text.primary, // Ensure good contrast
            }}
        >
            {" "}
            <Tooltip title="Float Left" slotProps={slotProps}>
                <IconButton onClick={() => setFloatingMode("left")}>
                    <FormatAlignLeftIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Float Right" slotProps={slotProps}>
                <IconButton onClick={() => setFloatingMode("right")}>
                    <FormatAlignRightIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Remove Float" slotProps={slotProps}>
                <IconButton onClick={() => setFloatingMode("none")}>
                    <FormatAlignJustify />
                </IconButton>
            </Tooltip>
            <Tooltip title="Link" slotProps={slotProps}>
                <IconButton onClick={showLinkEditPopup}>
                    <LinkIcon />
                </IconButton>
            </Tooltip>

            {imageLink && <Tooltip title="Unlink" slotProps={slotProps}>
                <IconButton onClick={removeLinkFromImage}>
                    <LinkOffIcon />
                </IconButton>
            </Tooltip>
            }

        </Paper>
    );
};
