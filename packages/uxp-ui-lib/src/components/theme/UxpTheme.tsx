import { ThemeProvider } from "@emotion/react";
import { CssBaseline, Theme } from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import { getUxpWindow } from "../../features/remote-app/uxp-window";
import { defaultTheme, draculaTheme } from "./theme";

type UxpThemeProps = {
    children: React.ReactNode;
};
export const UXP_THEME_CHANGE_EVENT = "uxpThemeChange";

export const UxpTheme: React.FC<UxpThemeProps> = ({ children }) => {
    const [theme, setTheme] = useState(getUxpWindow()?.theme); // Get the initial theme

    const failBackTheme = useMemo(() => {
        if (getUxpWindow()?.defaultTheme === "dracula") {
            return draculaTheme;
        }
        return defaultTheme;
    }, []);

    useEffect(() => {
        const handleThemeChange = () => {
            const uxp = getUxpWindow();
            uxp && uxp.theme && setTheme(uxp.theme); // Update the theme on change
        };

        window.addEventListener(UXP_THEME_CHANGE_EVENT, handleThemeChange);

        return () => {
            window.removeEventListener(UXP_THEME_CHANGE_EVENT, handleThemeChange);
        };
    }, []);

    return (
        <ThemeProvider theme={theme ?? failBackTheme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
};
