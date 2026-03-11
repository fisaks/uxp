import ImageIcon from "@mui/icons-material/Image";
import { Box, Card, Grid2, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React from "react";
import { BlueprintIconEntry, blueprintIconMap } from "../../view/blueprintIconMap";

/** Groups icon entries by their category prefix (before the colon). */
function groupByCategory(entries: [string, BlueprintIconEntry][]): Record<string, [string, BlueprintIconEntry][]> {
    const groups: Record<string, [string, BlueprintIconEntry][]> = {};
    for (const entry of entries) {
        const [name] = entry;
        const category = name.split(":")[0];
        if (!groups[category]) groups[category] = [];
        groups[category].push(entry);
    }
    return groups;
}

export const IconPreviewPage: React.FC = () => {
    const theme = useTheme();
    const entries = Object.entries(blueprintIconMap) as [string, BlueprintIconEntry][];
    const grouped = groupByCategory(entries);

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                <ImageIcon sx={{ color: "primary.main" }} />
                <Typography variant="h1">Icons</Typography>
            </Box>
            {Object.entries(grouped).map(([category, icons]) => (
                <Box key={category} sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2, textTransform: "capitalize" }}>
                        {category}
                    </Typography>
                    <Grid2 container spacing={2}>
                        {icons.map(([name, entry]) => {
                            const ActiveIcon = entry.active;
                            const InactiveIcon = entry.inactive;
                            const activeColor = entry.colors?.active[theme.palette.mode];
                            return (
                                <Grid2 key={name} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            py: 2,
                                            px: 1,
                                            minHeight: 100,
                                        }}
                                    >
                                        <Box sx={{ display: "flex", gap: 1.5, mb: 1 }}>
                                            <ActiveIcon sx={{
                                                fontSize: 36,
                                                color: activeColor ?? theme.palette.text.primary,
                                            }} />
                                            {InactiveIcon ? (
                                                <InactiveIcon sx={{
                                                    fontSize: 36,
                                                    color: theme.palette.action.disabled,
                                                }} />
                                            ) : (
                                                <ActiveIcon sx={{
                                                    fontSize: 36,
                                                    color: theme.palette.action.disabled,
                                                }} />
                                            )}
                                        </Box>
                                        <Typography
                                            variant="caption"
                                            align="center"
                                            sx={{
                                                fontFamily: "monospace",
                                                fontSize: "0.7rem",
                                                wordBreak: "break-all",
                                                color: theme.palette.text.secondary,
                                            }}
                                        >
                                            {name}
                                        </Typography>
                                    </Card>
                                </Grid2>
                            );
                        })}
                    </Grid2>
                </Box>
            ))}
        </Box>
    );
};
