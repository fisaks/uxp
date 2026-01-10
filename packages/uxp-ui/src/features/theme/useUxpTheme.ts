import { defaultTheme, draculaTheme, getUxpWindow, rebelAllianceTheme, starWarsDarkSideTheme, sunsetTheme, tatooineTheme, windsOfWinterTheme } from "@uxp/ui-lib";

import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { selectMySetting } from "../settings/mySettingSelector";

const DEFAULT_TEHME = "dracula";
export const useUxpTheme = () => {
    const mySettings = useSelector(selectMySetting());

    const theme = React.useMemo(
        () => {
            const t = mySettings?.theme ?? DEFAULT_TEHME;
            if (t === "dracula") return draculaTheme
            if (t === "starWarsDarkSide") return starWarsDarkSideTheme;
            if (t === "rebelAlliance") return rebelAllianceTheme;
            if (t === "sunset") return sunsetTheme;
            if (t === "tatooine") return tatooineTheme;
            if (t === "windsOfWinter") return windsOfWinterTheme;
            return defaultTheme
        },
        [mySettings?.theme]
    );
    useEffect(() => {
        getUxpWindow()?.updateTheme?.(theme);
    }, [theme]);

    return theme;
};
