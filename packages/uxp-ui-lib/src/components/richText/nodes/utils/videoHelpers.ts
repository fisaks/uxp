import { Theme } from "@mui/material";

export const AlignmentStyles: Record<string, React.CSSProperties> = {
    left: { float: "left", margin: "0 1em 1em 0" },
    right: { float: "right", margin: "0 0 1em 1em" },
    center: { display: "block", margin: "1em auto" },
};

export const activeAlignStyle = (theme: Theme) => ({
    border: `2px solid ${theme.palette.primary.main}`,
    borderRadius: 2,
});