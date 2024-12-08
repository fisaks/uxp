import { ThemeProvider } from "@emotion/react";
import { CssBaseline } from "@mui/material";
import React from "react";
import { useUxpTheme } from "./useUxpTheme";

type ThemeWrapperProps = {
    children: React.ReactNode;
};

export const ThemeWrapper: React.FC<ThemeWrapperProps> = ({ children }) => {
    const theme = useUxpTheme();

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
};
