import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
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
                    await dispatch(fetchMySettings({}));
                    setLoading(false);
                },
                (_, payload) => {
                    if (payload !== "Action already in progress") {
                        setLoading(false);
                    }
                }
            )
        );
    }, [dispatch, isLoggedInUser]);

    return loading;
};
