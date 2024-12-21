import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { fetchMySettings } from "../features/settings/mySettingThunk";
import { selectIsLoggedInUser } from "../features/user/userSelectors";
import { whoami } from "../features/user/userThunks";
import { handleThunkResult } from "../utils/thunkUtils";
import { useAppDispatch } from "./useAppDispatch";
import { fetchNavigation } from "../features/navigation/navigationThunk";

export const useInitializeApp = () => {
    const dispatch = useAppDispatch();
    const [loading, setLoading] = useState(true);
    const isLoggedInUser = useSelector(selectIsLoggedInUser());

    useEffect(() => {
        dispatch(whoami({})).then(
            handleThunkResult(
                async () => {
                    await dispatch(fetchMySettings({}));
                    await dispatch(fetchNavigation({}));
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

    return loading;
};
