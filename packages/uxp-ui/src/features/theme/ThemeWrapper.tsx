import { ThemeProvider } from "@emotion/react";
import { CssBaseline } from "@mui/material";
import React from "react";
import { useUxpTheme } from "./useUxpTheme";
import { useThemeEffect } from "./useThemeEffect";

type ThemeWrapperProps = {
    children: React.ReactNode;
};

export const ThemeWrapper: React.FC<ThemeWrapperProps> = ({ children }) => {
    const theme = useUxpTheme();
    const themeEffect = useThemeEffect();

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
            {themeEffect}
        </ThemeProvider>
    );
};
