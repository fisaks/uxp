import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CodeIcon from "@mui/icons-material/Code";
import DeleteIcon from "@mui/icons-material/Delete";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatLineSpacingIcon from "@mui/icons-material/FormatLineSpacing";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import FormatStrikethroughIcon from "@mui/icons-material/FormatStrikethrough";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import ImageIcon from "@mui/icons-material/Image";
import VideoFileIcon from "@mui/icons-material/VideoFile";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import SubscriptIcon from '@mui/icons-material/Subscript';
import Superscript from '@mui/icons-material/Superscript';
import TableChartIcon from "@mui/icons-material/TableChart";
import TableRowsIcon from "@mui/icons-material/TableRows";
import TitleIcon from "@mui/icons-material/Title";
import VideoCameraFrontIcon from "@mui/icons-material/VideoCameraFront";
import TableColumnsIcon from "@mui/icons-material/ViewColumn";
import { useMemo } from "react";
import { MenuItemType } from "../../layout/RecursiveMenuItem";
import { useRichEditorUI } from "../RichEditorContext";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const userEditorMenu = () => {
    const { editor, triggerUpload, hasCamera } = useRichEditorUI();
    const editItems: MenuItemType[] = useMemo(
        () => [
            {
                icon: <FormatBoldIcon />,
                label: "Bold",
                tooltip: "Bold (Ctrl + B)",
                onClick: () => editor?.chain().focus().toggleBold().run(),
            },
            {
                icon: <FormatItalicIcon />,
                label: "Italic",
                tooltip: "Italic (Ctrl + I)",
                onClick: () => editor?.chain().focus().toggleItalic().run(),
            },
            {
                icon: <FormatUnderlinedIcon />,
                label: "Underline",
                tooltip: "Underline (Ctrl + U)",
                onClick: () => editor?.chain().focus().toggleUnderline().run(),
            },
            {
                icon: <FormatStrikethroughIcon />,
                label: "Strikethrough",
                tooltip: "Strikethrough (Ctrl + Shift + X)",
                onClick: () => editor?.chain().focus().toggleStrike().run(),
            },
            {
                icon: () => editor?.isActive("link") ? <LinkOffIcon /> : <LinkIcon />,
                label: () => editor?.isActive("link") ? "Unlink" : "Link",
                tooltip: "Link/Unlink (Ctrl + Shift + K)",
                onClick: () => editor?.commands.toggleLinkCustom(),
                //onClick: () => editor?.commands.setImageLink("foioo.com"),
            },
            {
                icon: <FormatLineSpacingIcon />,
                label: "Line Height",
                children: [
                    ...["1.2", "1.5", "2.0"].map((height, index) => ({
                        icon: <FormatLineSpacingIcon />,
                        label: `Line Height ${height}`,
                        tooltip: `Line Height ${height} (Ctrl + Shift ${index})`,
                        onClick: () => editor?.chain().focus().setLineHeight(height).run(),
                    })),
                ],
            },
            {
                icon: <TitleIcon />,
                label: "Heading",
                children: [
                    ...[1, 2, 3, 4, 5, 6].map((level, index) => ({
                        icon: <TitleIcon />,
                        label: `Heading ${level}`,
                        tooltip: `Heading ${level}  (Ctrl + Alt + ${index})`,
                        onClick: () =>
                            editor
                                ?.chain()
                                .focus()
                                .toggleHeading({ level: level as HeadingLevel })
                                .run(),
                    })),
                    {
                        icon: <TitleIcon />,
                        label: `Paragraph`,
                        tooltip: `Paragraph (Ctrl + Alt + 0`,
                        onClick: () => editor?.chain().focus().setParagraph().run(),
                    },
                ],
            },
            {
                icon: <SubscriptIcon />,
                label: "Subscript",
                tooltip: "Subscript (Ctrl + ,)",
                onClick: () => editor?.chain().focus().toggleSubscript().run(),
            },
            {
                icon: <Superscript />,
                label: "Superscript",
                tooltip: "Superscript (Ctrl + Shift + ,)",
                onClick: () => editor?.chain().focus().toggleSuperscript().run(),
            },
            {
                icon: <CodeIcon />,
                label: "Code",
                tooltip: "Code (Ctrl + E)",
                onClick: () => editor?.chain().focus().toggleCode().run(),
            },
        ],
        [editor]
    );
    const addItems: MenuItemType[] = useMemo(
        () => [
            {
                icon: <FormatQuoteIcon />,
                label: "Blockquote",
                tooltip: "Blockquote (Ctrl + Shift + B)",
                onClick: () => editor?.chain().focus().toggleBlockquote().run(),
            },
            {
                icon: <CodeIcon />,
                label: "Code Block",
                tooltip: "Code Block (Ctrl + Shift + C)",
                onClick: () => editor?.chain().focus().toggleCodeBlock().run(),
            },
            {
                icon: <ImageIcon />,
                label: "Insert Image",
                tooltip: "Insert Image (Ctrl + Shift + I)",
                onClick: () => triggerUpload("image","file"),
            },
            {
                icon: <VideoFileIcon />,
                label: "Insert Video",
                onClick:  () => triggerUpload("video","file"),
            },
            {
                icon: <AttachFileIcon />,
                label: "Insert Attachment",
                onClick:  () => triggerUpload("document","file"),
            },
            {
                icon: <CameraAltIcon />,
                label: "Capture Image",
                disabled: !hasCamera,
                onClick:  () => triggerUpload("image","camera"),
            },
            {
                icon: <VideoCameraFrontIcon />,
                label: "Record Video",
                disabled: !hasCamera,
                onClick:  () => triggerUpload("video","camera"),
            },

            {
                icon: <FormatListBulletedIcon />,
                label: "Lists",
                children: [
                    {
                        icon: <FormatListBulletedIcon />,
                        label: "Bullet List",
                        tooltip: "Bullet List (Ctrl + Shift + 8)",
                        onClick: () => editor?.chain().focus().toggleBulletList().run(),
                    },
                    {
                        icon: <FormatListNumberedIcon />,
                        label: "Numbered List",
                        tooltip: "Numbered List (Ctrl + Shift + 7)",
                        onClick: () => editor?.chain().focus().toggleOrderedList().run(),
                    },
                ],
            },

            {
                icon: <TableChartIcon />,
                label: "Table",
                children: [
                    {
                        icon: <TableChartIcon />,
                        label: "Insert Table",
                        tooltip: "Insert Table (Ctrl + Alt + Shift + Insert)",
                        onClick: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3 }).run(),
                    },
                    {
                        icon: <TableRowsIcon />,
                        label: "Add Row After",
                        tooltip: "Add Row After (Alt + Shift + Insert)",
                        onClick: () => editor?.chain().focus().addRowAfter().run(),
                    },
                    {
                        icon: <TableRowsIcon />,
                        label: "Add Row Before",
                        tooltip: "Add Row Before (Alt + Insert)",
                        onClick: () => editor?.chain().focus().addRowBefore().run(),
                    },
                    {
                        icon: <TableColumnsIcon />,
                        label: "Add Column After",
                        tooltip: "Add Column After (Ctrl + Shift + Insert)",
                        onClick: () => editor?.chain().focus().addColumnAfter().run(),
                    },
                    {
                        icon: <TableColumnsIcon />,
                        label: "Add Column Before",
                        tooltip: "Add Column Before (Ctrl + Insert)",
                        onClick: () => editor?.chain().focus().addColumnBefore().run(),
                    },
                    {
                        icon: <DeleteIcon />,
                        label: "Remove Row",
                        tooltip: "Remove Row (Alt + Delete)",
                        onClick: () => editor?.chain().focus().deleteRow().run(),
                    },
                    {
                        icon: <DeleteIcon />,
                        label: "Remove Column",
                        tooltip: "Remove Row (Ctrl + Delete)",
                        onClick: () => editor?.chain().focus().deleteColumn().run(),
                    },
                    {
                        icon: <DeleteIcon />,
                        label: "Remove Table",
                        tooltip: "Remove Table (Ctrl + Alt + Shift + Delete)",
                        onClick: () => editor?.chain().focus().deleteTable().run(),
                    },
                ],
            },
        ],
        [editor, hasCamera]
    );

    return [editItems, addItems];
};
