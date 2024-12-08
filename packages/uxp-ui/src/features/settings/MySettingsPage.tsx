import { FormControlLabel, Paper, Radio, RadioGroup, Typography } from "@mui/material";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { CenteredBox, LoadingButton } from "@uxp/ui-lib";
import { useAppDispatch } from "../../hooks";
import { selectIsLoading, selectIsProcessed } from "../loading/loadingSelectors";
import { selectCurrentUser } from "../user/userSelectors";
import { selectMySetting } from "./mySettingSelector";
import { updateMySettings } from "./mySettingThunk";
import { UserSettingsPayload } from "@uxp/common";

type SettingsDataProps = {
    staleData: UserSettingsPayload;
    setStaleData: React.Dispatch<React.SetStateAction<UserSettingsPayload>>;
};
const settingsData = [
    {
        title: "Theme",
        content: ({ staleData, setStaleData }: SettingsDataProps) => {
            const [themeMode, setThemeMode] = useState<string | undefined>();
            const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
                setStaleData((data) => ({ ...data, theme: event.target.value as "light" | "dracula" }));
                //setThemeMode(event.target.value as "light" | "dracula");
            };

            return (
                <RadioGroup value={staleData.theme} onChange={handleThemeChange}>
                    <FormControlLabel value="light" control={<Radio />} label="Light Theme" />
                    <FormControlLabel value="dracula" control={<Radio />} label="Dracula Theme" />
                </RadioGroup>
            );
        },
    },
];

const MySettingsPage: React.FC = () => {
    const mySetting = useSelector(selectMySetting());
    const isLoading = useSelector(selectIsLoading("mysettings/update"));
    const isProcessed = useSelector(selectIsProcessed("mysettings/update"));
    const user = useSelector(selectCurrentUser());
    const [staleData, setStaleData] = useState<UserSettingsPayload>({ theme: mySetting?.theme });
    const dispatch = useAppDispatch();

    const update = () => {
        dispatch(updateMySettings(staleData));
    };
    return (
        <CenteredBox maxWidth={600}>
            <Typography variant="h4" component="h1" sx={{ marginBottom: 3 }}>
                My Settings ({user?.username})
            </Typography>

            {settingsData.map((setting, index) => (
                <Paper
                    key={index}
                    sx={{
                        padding: 3,
                        marginBottom: 2,
                        bgcolor: "background.paper",
                        //backgroundColor: index % 2 === 0 ? 'grey.100' : 'grey.200', // Alternate color shades
                    }}
                >
                    <Typography variant="h5" component="h2" sx={{ marginBottom: 2 }}>
                        {setting.title}
                    </Typography>

                    <setting.content setStaleData={setStaleData} staleData={staleData} />
                </Paper>
            ))}
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
        </CenteredBox>
    );
};

export default MySettingsPage;
