import React from "react";
import { useSelector } from "react-redux";
import { selectMySetting } from "../settings/mySettingSelector";
import { defaultTheme, draculaTheme } from "./theme";
const DEFAULT_TEHME = "dracula";
export const useUxpTheme = () => {
    const mySettings = useSelector(selectMySetting());

    const theme = React.useMemo(
        () => ((mySettings?.theme ?? DEFAULT_TEHME) === "dracula" ? draculaTheme : defaultTheme),
        [mySettings?.theme]
    );

    return theme;
};
