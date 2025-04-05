import { Box, Typography } from "@mui/material";
import React from "react";

type OutlinedBoxProps = {
  label: string;
  children: React.ReactNode;
  sx?: object;
};

export const OutlinedBox: React.FC<OutlinedBoxProps> = ({ label, children, sx }) => {
  return (
    <Box sx={{ position: "relative", mt: 3, ...sx }}>
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          padding: 2,
        }}
      >
        {children}
      </Box>
      <Typography
        variant="body2"
        sx={{
          position: "absolute",
          top: 0,
          left: 12,
          transform: "translateY(-50%)",
          px: 0.5,
          bgcolor: "background.paper",
          fontWeight: 500,
          color: "text.secondary",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};
