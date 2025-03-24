import { UXP_DEVICE_ID } from "@uxp/ui-lib";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { fetchLatestGlobalSettings } from "../features/global-config/globalConfigThunk";
import { fetchNavigation } from "../features/navigation/navigationThunk";
import { fetchMySettings } from "../features/settings/mySettingThunk";
import { selectIsLoggedInUser } from "../features/user/userSelectors";
import { whoami } from "../features/user/userThunks";
import { handleThunkResult } from "../utils/thunkUtils";
import { useAppDispatch } from "./useAppDispatch";

export const useInitializeApp = () => {
    const dispatch = useAppDispatch();
    const [loading, setLoading] = useState(true);
    const isLoggedInUser = useSelector(selectIsLoggedInUser());

    useEffect(() => {
        dispatch(whoami({})).then(
            handleThunkResult(
                async () => {
                    const promises = [
                        dispatch(fetchMySettings({})),
                        dispatch(fetchNavigation({})),
                        dispatch(fetchLatestGlobalSettings({})),
                    ];
                    await Promise.all(promises);

                    setLoading(false);
                },
                async (_, payload) => {
                    console.log("Error", payload);
                    if (payload !== "Action already in progress") {
                        if (payload?.errors?.length > 0 && payload.errors[0].code === "INVALID_REFRESH_TOKEN") {
                            await dispatch(fetchNavigation({}));
                        }
                        setLoading(false);
                    }
                }
            )
        );
    }, [dispatch, isLoggedInUser]);

    useEffect(() => {
        let id = localStorage.getItem(UXP_DEVICE_ID);
        if (!id) {
            id = crypto.randomUUID(); // or nanoid
            localStorage.setItem(UXP_DEVICE_ID, id);
        }

    }, []);

    return loading;
};
