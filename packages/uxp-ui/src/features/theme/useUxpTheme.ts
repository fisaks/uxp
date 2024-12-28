import { UXP_THEME_CHANGE_EVENT, defaultTheme, draculaTheme } from "@uxp/ui-lib";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { selectMySetting } from "../settings/mySettingSelector";

const DEFAULT_TEHME = "dracula";
export const useUxpTheme = () => {
    const mySettings = useSelector(selectMySetting());

    const theme = React.useMemo(
        () => ((mySettings?.theme ?? DEFAULT_TEHME) === "dracula" ? draculaTheme : defaultTheme),
        [mySettings?.theme]
    );
    useEffect(() => {
        if (window.uxp && !window.uxp?.theme) {
            window.uxp.theme = theme;
            window.uxp.defaultTheme = DEFAULT_TEHME;
            window.uxp.updateTheme = (theme) => {
                window.uxp!.theme = theme;

                // Dispatch a custom event to notify remote apps
                window.dispatchEvent(
                    new CustomEvent(UXP_THEME_CHANGE_EVENT, {
                        detail: window.uxp!.theme,
                    })
                );
            };
        }
        window.uxp?.updateTheme && window.uxp.updateTheme(theme);
    }, [theme]);

    return theme;
};
