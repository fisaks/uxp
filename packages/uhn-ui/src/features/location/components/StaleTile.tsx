import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { Card, Typography } from "@mui/material";
import React from "react";

export const StaleTile: React.FC = () => (
    <Card
        variant="outlined"
        sx={{
            borderRadius: 3,
            boxShadow: 2,
            height: { xs: "auto", sm: 154 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
            opacity: 0.6,
        }}
    >
        <HelpOutlineIcon sx={{ fontSize: 32, color: "text.disabled", mb: 1 }} />
        <Typography variant="body2" color="text.secondary" textAlign="center">
            Item no longer available
        </Typography>
    </Card>
);
