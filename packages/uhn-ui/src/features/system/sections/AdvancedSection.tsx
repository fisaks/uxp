import { Box, Button, Typography } from "@mui/material";
import React from "react";

type AdvancedSectionProps = {
    disabled: boolean;
    onRecompile: (e: React.MouseEvent) => void;
};

export const AdvancedSection: React.FC<AdvancedSectionProps> = ({
    disabled,
    onRecompile,
}) => (
    <Box>
        <Typography variant="subtitle2">Advanced</Typography>
        <Button
            sx={{ mt: 1 }}
            variant="outlined"
            disabled={disabled}
            onClick={onRecompile}
        >
            Recompile active blueprint
        </Button>
    </Box>
);
