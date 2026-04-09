import { defaultTheme, draculaTheme, getUxpWindow, godzillaTheme, rebelAllianceTheme, starWarsDarkSideTheme, sunsetTheme, tatooineTheme, THEME_EFFECTS, windsOfWinterTheme, witcherTheme, wizardTheme } from "@uxp/ui-lib";

import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { selectMySetting } from "../settings/mySettingSelector";

const DEFAULT_TEHME = "dracula";
export const useUxpTheme = () => {
    const mySettings = useSelector(selectMySetting());
    const themeKey = mySettings?.theme ?? DEFAULT_TEHME;

    const theme = React.useMemo(
        () => {
            if (themeKey === "dracula") return draculaTheme
            if (themeKey === "starWarsDarkSide") return starWarsDarkSideTheme;
            if (themeKey === "rebelAlliance") return rebelAllianceTheme;
            if (themeKey === "sunset") return sunsetTheme;
            if (themeKey === "tatooine") return tatooineTheme;
            if (themeKey === "windsOfWinter") return windsOfWinterTheme;
            if (themeKey === "godzilla") return godzillaTheme;
            if (themeKey === "wizard") return wizardTheme;
            if (themeKey === "witcher") return witcherTheme;
            return defaultTheme
        },
        [themeKey]
    );

    useEffect(() => {
        const uxp = getUxpWindow();
        if (uxp) {
            uxp.updateTheme?.(theme);
            uxp.themeEffect = THEME_EFFECTS[themeKey];
        }
    }, [theme, themeKey]);

    return theme;
};
