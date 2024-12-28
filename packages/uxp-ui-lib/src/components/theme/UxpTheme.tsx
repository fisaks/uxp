import React from "react";
import { ThemeProvider } from "@emotion/react";
import { CssBaseline, Theme } from "@mui/material";
import { useEffect, useState } from "react";

type UxpThemeProps = {
    children: React.ReactNode;
};
export const UXP_THEME_CHANGE_EVENT = "uxpThemeChange";
export const UxpTheme: React.FC<UxpThemeProps> = ({ children }) => {
    const [theme, setTheme] = useState(window.uxp?.theme as Theme); // Get the initial theme

    useEffect(() => {
        const handleThemeChange = () => {
            setTheme(window.uxp?.theme as Theme); // Update the theme on change
        };

        // Listen for theme changes
        window.addEventListener(UXP_THEME_CHANGE_EVENT, handleThemeChange);

        return () => {
            // Clean up event listener
            window.removeEventListener(UXP_THEME_CHANGE_EVENT, handleThemeChange);
        };
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
};
