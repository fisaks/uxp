import { Box, FormControlLabel, MenuItem, Paper, Radio, RadioGroup, Select, Switch, Typography } from "@mui/material";

import { ThemeEffectMode, ThemeKeys, UserSettingsPayload } from "@uxp/common";
import { CenteredBox, LoadingButton, Show, THEME_EFFECTS } from "@uxp/ui-lib";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../hooks";
import { selectIsLoading, selectIsProcessed } from "../loading/loadingSelectors";
import { selectCurrentUser } from "../user/userSelectors";
import { selectMySetting } from "./mySettingSelector";
import { updateMySettings } from "./mySettingThunk";
import DraculaEffect from "../theme/DraculaEffect";
import Snowfall from "../theme/Snowfall";
import GodzillaStrike from "../theme/GodzillaStrike";
import WizardSpell from "../theme/WizardSpell";
import WitcherIgni from "../theme/WitcherIgni";
import DarkSideEffect from "../theme/DarkSideEffect";
import SunsetEffect from "../theme/SunsetEffect";
import TatooineEffect from "../theme/TatooineEffect";
import RebelAllianceEffect from "../theme/RebelAllianceEffect";

type SettingsDataProps = {
    staleData: UserSettingsPayload;
    setStaleData: React.Dispatch<React.SetStateAction<UserSettingsPayload>>;
};


type SettingsSection = {
    title: string;
    /** When provided, section is only rendered if this returns true */
    visible?: (staleData: UserSettingsPayload) => boolean;
    content: React.FC<SettingsDataProps>;
};

const settingsData: SettingsSection[] = [
    {
        title: "Theme",
        content: ({ staleData, setStaleData }) => {
            const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
                setStaleData((data) => ({ ...data, theme: event.target.value as ThemeKeys }));
            };

            const effectMeta = staleData.theme ? THEME_EFFECTS[staleData.theme] : undefined;

            return (
                <>
                    <RadioGroup value={staleData.theme} onChange={handleThemeChange}>
                        <FormControlLabel value="light" control={<Radio />} label="Light Theme" />
                        <FormControlLabel value="dracula" control={<Radio />} label="Dracula Theme" />
                        <FormControlLabel value="starWarsDarkSide" control={<Radio />} label="Star Wars Dark Side" />
                        <FormControlLabel value="rebelAlliance" control={<Radio />} label="Rebel Alliance" />
                        <FormControlLabel value="tatooine" control={<Radio />} label="Tatooine" />
                        <FormControlLabel value="sunset" control={<Radio />} label="Sunset" />
                        <FormControlLabel value="windsOfWinter" control={<Radio />} label="Winds Of Winter" />
                        <FormControlLabel value="godzilla" control={<Radio />} label="Godzilla" />
                        <FormControlLabel value="wizard" control={<Radio />} label="Wizard" />
                        <FormControlLabel value="witcher" control={<Radio />} label="The Witcher" />
                    </RadioGroup>
                    <Show when={effectMeta}>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            This theme has a visual effect. Use &quot;{effectMeta?.name}&quot; in
                            the command palette to trigger it. Stop with Escape, double-click/tap,
                            or &quot;Stop Effect&quot; in the palette.
                        </Typography>
                    </Show>
                </>
            );
        },
    },
    {
        title: "Auto Effect",
        visible: (staleData) => !!(staleData.theme && THEME_EFFECTS[staleData.theme]),
        content: ({ staleData, setStaleData }) => {
            const updateEffectSetting = (changes: Partial<NonNullable<UserSettingsPayload["themeEffect"]>>) =>
                setStaleData(d => ({ ...d, themeEffect: { ...d.themeEffect!, ...changes } }));

            const handleAutoTriggerChange = (e: React.ChangeEvent<HTMLInputElement>) => updateEffectSetting({ autoTrigger: e.target.checked });
            const handleModeChange = (e: React.ChangeEvent<HTMLInputElement>) => updateEffectSetting({ mode: e.target.value as ThemeEffectMode });
            const handleFrequencyChange = (e: { target: { value: unknown } }) => updateEffectSetting({ frequency: e.target.value as number });
            const handleDurationChange = (e: { target: { value: unknown } }) => updateEffectSetting({ duration: e.target.value as number });

            const defaultDuration = Math.round((THEME_EFFECTS[staleData.theme!]?.durationMs ?? 0) / 1000);

            return (
                <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        When enabled, the theme effect plays automatically at randomized intervals
                        while the tab is active. It will be dismissed after the configured duration,
                        or manually with Escape, double-click/tap, or &quot;Stop Effect&quot; in the palette.
                    </Typography>

                    <FormControlLabel
                        control={<Switch checked={staleData.themeEffect?.autoTrigger ?? false} onChange={handleAutoTriggerChange} />}
                        label="Auto-trigger effect"
                    />

                    <Show when={staleData.themeEffect?.autoTrigger}>
                        <Box sx={{ ml: 2, mt: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <Box>
                                <Typography variant="body2" sx={{ mb: 0.5 }}>Mode</Typography>
                                <RadioGroup row value={staleData.themeEffect?.mode ?? "silent"} onChange={handleModeChange}>
                                    <FormControlLabel value="full" control={<Radio size="small" />} label="Full (with sound)" />
                                    <FormControlLabel value="silent" control={<Radio size="small" />} label="Silent (no sound)" />
                                </RadioGroup>
                            </Box>
                            <Box>
                                <Typography variant="body2" sx={{ mb: 0.5 }}>Frequency</Typography>
                                <Select size="small" value={staleData.themeEffect?.frequency ?? 15} onChange={handleFrequencyChange}>
                                    <MenuItem value={5}>Every ~5 minutes</MenuItem>
                                    <MenuItem value={10}>Every ~10 minutes</MenuItem>
                                    <MenuItem value={15}>Every ~15 minutes</MenuItem>
                                    <MenuItem value={30}>Every ~30 minutes</MenuItem>
                                    <MenuItem value={60}>Every ~60 minutes</MenuItem>
                                </Select>
                            </Box>
                            <Box>
                                <Typography variant="body2" sx={{ mb: 0.5 }}>Duration</Typography>
                                <Select size="small" value={staleData.themeEffect?.duration ?? 0} onChange={handleDurationChange}>
                                    <MenuItem value={0}>Default ({defaultDuration}s — one cycle)</MenuItem>
                                    <MenuItem value={10}>10 seconds</MenuItem>
                                    <MenuItem value={30}>30 seconds</MenuItem>
                                    <MenuItem value={60}>1 minute</MenuItem>
                                    <MenuItem value={120}>2 minutes</MenuItem>
                                    <MenuItem value={180}>3 minutes</MenuItem>
                                    <MenuItem value={300}>5 minutes</MenuItem>
                                </Select>
                            </Box>
                        </Box>
                    </Show>
                </>
            );
        },
    },
];

const MySettingsPage: React.FC = () => {
    const mySetting = useSelector(selectMySetting());
    const isLoading = useSelector(selectIsLoading("mysettings/update"));
    const isProcessed = useSelector(selectIsProcessed("mysettings/update"));
    const user = useSelector(selectCurrentUser());
    const [staleData, setStaleData] = useState<UserSettingsPayload>({
        theme: mySetting?.theme,
        themeEffect: mySetting?.themeEffect ?? { autoTrigger: false, mode: "silent", frequency: 15, duration: 0 },
    });
    const dispatch = useAppDispatch();
    const dracula = useMemo(() => <DraculaEffect />, []);
    const snow = useMemo(() => <Snowfall />, []);
    const sunset = useMemo(() => <SunsetEffect />, []);
    const tatooine = useMemo(() => <TatooineEffect />, []);
    const darkSide = useMemo(() => <DarkSideEffect />, []);
    const rebelAlliance = useMemo(() => <RebelAllianceEffect />, []);
    const godzilla = useMemo(() => <GodzillaStrike />, []);
    const wizard = useMemo(() => <WizardSpell />, []);
    const witcher = useMemo(() => <WitcherIgni />, []);
    const update = () => {
        dispatch(updateMySettings(staleData));
    };
    return (
        <CenteredBox maxWidth={600}>
            <Typography variant="h4" component="h1" sx={{ marginBottom: 3 }}>
                My Settings ({user?.username})
            </Typography>

            {settingsData.map((setting, index) => {
                if (setting.visible && !setting.visible(staleData)) return null;
                return (
                    <Paper
                        key={index}
                        sx={{
                            padding: 3,
                            marginBottom: 2,
                            bgcolor: "background.paper",
                        }}
                    >
                        <Typography variant="h5" component="h2" sx={{ marginBottom: 2 }}>
                            {setting.title}
                        </Typography>

                        <setting.content setStaleData={setStaleData} staleData={staleData} />
                    </Paper>
                );
            })}
            <LoadingButton
                variant="contained"
                color="primary"
                onClick={update}
                isLoading={isLoading}
                done={isProcessed}
                doneText="Settings Updated"
            >
                Update Settings
            </LoadingButton>
            {mySetting?.theme === "sunset" && sunset}
            {mySetting?.theme === "tatooine" && tatooine}
            {mySetting?.theme === "dracula" && dracula}
            {mySetting?.theme === "starWarsDarkSide" && darkSide}
            {mySetting?.theme === "rebelAlliance" && rebelAlliance}
            {mySetting?.theme === "windsOfWinter" && snow}
            {mySetting?.theme === "godzilla" && godzilla}
            {mySetting?.theme === "wizard" && wizard}
            {mySetting?.theme === "witcher" && witcher}
        </CenteredBox>
    );
};

export default MySettingsPage;
