import { Box } from "@mui/material";
import React, { CSSProperties } from "react";

interface CenteredBoxProps {
    children: React.ReactNode;
    maxWidth?: CSSProperties["maxWidth"]; // Use the built-in type for maxWidth
    fullHeight?: boolean; // Default is false
}

const CenteredBox: React.FC<CenteredBoxProps> = ({
    children,
    maxWidth = 800, // Default to 800px (interpreted as a number for simplicity)
    fullHeight = false, // Default to compact height
}) => (
    <Box
        sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            bgcolor: "background.default",
            padding: 2,
            height: fullHeight ? "100vh" : "auto", // Full height or adjust to content
        }}
    >
        <Box
            sx={{
                width: "100%",
                maxWidth, // Automatically supports all valid CSS maxWidth values
                bgcolor: "background.paper",
                padding: 3,
                borderRadius: 1,
                boxShadow: 3,
            }}
        >
            {children}
        </Box>
    </Box>
);

export default CenteredBox;
