import FormatAlignJustify from "@mui/icons-material/FormatAlignJustify";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import { IconButton, Paper, Tooltip, TooltipProps, useTheme } from "@mui/material";
import { Editor } from "@tiptap/core";
import * as styles from "../RichTextEditor.module.css";
import React from "react";

type FloatingToolbarProps = {
    editor: Editor;
    imagePos: { top: number; left: number } | null;
    slotProps: TooltipProps["slotProps"];
    onClick: () => void;
};
export const FloatingImageToolbar: React.FC<FloatingToolbarProps> = ({ editor, imagePos, slotProps, onClick }) => {
    const theme = useTheme();

    if (!editor || !imagePos) return null;
    const handleClick = (float: String) => {
        editor.chain().focus().updateAttributes("image", { float }).run();
        onClick();
    };
    return (
        <Paper
            className={styles.floatingToolbar}
            elevation={4} // Slight shadow for better visibility
            style={{
                position: "absolute",
                top: `${imagePos.top}px`,
                left: `${imagePos.left}px`,
                backgroundColor: theme.palette.background.default, // Use theme background
                color: theme.palette.text.primary, // Ensure good contrast
            }}
        >
            {" "}
            <Tooltip title="Float Left" slotProps={slotProps}>
                <IconButton onClick={() => handleClick("left")}>
                    <FormatAlignLeftIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Float Right" slotProps={slotProps}>
                <IconButton onClick={() => handleClick("right")}>
                    <FormatAlignRightIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Remove Float" slotProps={slotProps}>
                <IconButton onClick={() => handleClick("none")}>
                    <FormatAlignJustify />
                </IconButton>
            </Tooltip>
        </Paper>
    );
};
