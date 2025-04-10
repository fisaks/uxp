import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import FormatIndentDecreaseIcon from "@mui/icons-material/FormatIndentDecrease";
import FormatIndentIncreaseIcon from "@mui/icons-material/FormatIndentIncrease";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import RedoIcon from "@mui/icons-material/Redo";
import UndoIcon from "@mui/icons-material/Undo";
import { Box, IconButton, Tooltip } from "@mui/material";
import { useMemo } from "react";
import MultiLevelMenu from "../../layout/MultiLevelMenu";
import { useRichEditorUI } from "../RichEditorContext";
import * as styles from "../RichTextEditor.module.css";
import { userEditorMenu } from "./useEditorMenu";

export const RichEditorToolbar = () => {
    const { editor, portalContainerRef, isFullScreen, toggleFullScreen } = useRichEditorUI();
    const [editItems, addItems] = userEditorMenu();
    const slotProps = useMemo(() => ({ popper: { container: portalContainerRef.current } }), [portalContainerRef.current]);
    if (!editor) return null;
    return (
        <Box className={`${styles.toolbar}`} sx={{ '@media print': { display: 'none' } }}>
            {/* Undo / Redo */}
            <Tooltip title="Undo (Ctrl + Z)" slotProps={slotProps}>
                <IconButton onClick={() => editor.commands.undo()}>
                    <UndoIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Redo (Ctrl + Shift + Z)" slotProps={slotProps}>
                <IconButton onClick={() => editor.commands.redo()}>
                    <RedoIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Increase Indent Ctrl + Space" slotProps={slotProps}>
                <IconButton
                    onClick={() => {
                        if (editor.can().sinkListItem("listItem")) {
                            editor.chain().focus().sinkListItem("listItem").run();
                        } else {
                            editor.chain().focus().increaseIndent().run();
                        }
                    }}
                >
                    <FormatIndentIncreaseIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Decrease Indent  Ctrl + Shift + Space" slotProps={slotProps}>
                <IconButton
                    onClick={() => {
                        if (editor.can().liftListItem("listItem")) {
                            editor.chain().focus().liftListItem("listItem").run();
                        } else {
                            editor.chain().focus().decreaseIndent().run();
                        }
                    }}
                >
                    <FormatIndentDecreaseIcon />
                </IconButton>
            </Tooltip>
            <MultiLevelMenu
                menuItems={editItems}
                triggerIcon={<EditIcon />}
                tooltipText="Edit Actions"
                container={portalContainerRef.current}
            />
            <MultiLevelMenu
                menuItems={addItems}
                triggerIcon={<AddIcon />}
                tooltipText="Add Actions"
                container={portalContainerRef.current}
            />
            <Tooltip title={isFullScreen ? "Exit Full Screen" : "Full Screen"} slotProps={slotProps}>
                <IconButton onClick={toggleFullScreen}>{isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}</IconButton>
            </Tooltip>
        </Box>
    );
};
