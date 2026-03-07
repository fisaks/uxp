import { Box, Card, Grid2, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React from "react";
import { blueprintIconMap } from "../../view/blueprintIconMap";

/** Groups icon entries by their category prefix (before the colon). */
function groupByCategory(entries: [string, React.ComponentType<any>][]): Record<string, [string, React.ComponentType<any>][]> {
    const groups: Record<string, [string, React.ComponentType<any>][]> = {};
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
    const entries = Object.entries(blueprintIconMap) as [string, React.ComponentType<any>][];
    const grouped = groupByCategory(entries);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 3 }}>Blueprint Icons</Typography>
            {Object.entries(grouped).map(([category, icons]) => (
                <Box key={category} sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2, textTransform: "capitalize" }}>
                        {category}
                    </Typography>
                    <Grid2 container spacing={2}>
                        {icons.map(([name, IconComponent]) => (
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
                                    <IconComponent sx={{
                                        fontSize: 36,
                                        color: theme.palette.text.primary,
                                        mb: 1,
                                    }} />
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
                        ))}
                    </Grid2>
                </Box>
            ))}
        </Box>
    );
};
