import { AsyncThunkPayloadCreator, createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosUtil } from "@uxp/common";
import { clearError, setError } from "../error/errorSlice";
import {
    clearLoading,
    clearProcessed,
    endAction,
    LoadingState,
    setLoading,
    setProcessed,
    startAction,
} from "../loading/loadingSlice";

export type LoadingKey =
    | "user/whoami"
    | "user/login"
    | "user/register"
    | "settings/update"
    | "user/logout"
    | "user/unlock"
    | "header/fetchMenuItems"
    | "user/profile"
    | "mysettings/fetch"
    | "mysettings/update"
    | "navigation/fetch"
    | "user/search"
    | "user/lock"
    | "user/unlock"
    | "user/updateRoles"
    | "globalSettings/patch"
    | "globalSettings/fetchLatest"
    | "user/tokenVersion";

export const createLoadingAwareThunk = <Returned, ThunkArg>(
    typePrefix: LoadingKey,
    action: AsyncThunkPayloadCreator<Returned, ThunkArg>,
    processedTimeout = 3000,
    multi = false
) => {
    return createAsyncThunk<Returned, ThunkArg>(typePrefix, async (args, thunkAPI) => {
        const { dispatch, getState, rejectWithValue } = thunkAPI;
        const state = getState() as { loading: LoadingState };
        if (!multi && state.loading.inProgress[typePrefix]) {
            console.warn(`Action ${typePrefix} is already in progress.`);
            return rejectWithValue("Action already in progress");
        }
        try {
            dispatch(clearError(typePrefix)); // Use typePrefix directly as the key
            dispatch(startAction(typePrefix));
            dispatch(setLoading(typePrefix)); // Use typePrefix directly as the key

            const result = await action(args, thunkAPI);
            // Set processed flag
            dispatch(setProcessed(typePrefix));
            setTimeout(() => {
                dispatch(clearProcessed(typePrefix));
            }, processedTimeout);
            return result as Returned;
        } catch (e: unknown) {
            const error = AxiosUtil.getErrorResponse(e);
            setTimeout(() => {
                dispatch(setError({ key: typePrefix, error }));
            }, 0);
            return rejectWithValue(error);
        } finally {
            // Delay clearing loading flag to ensure state updates are completed
            setTimeout(() => {
                dispatch(clearLoading(typePrefix));
                dispatch(endAction(typePrefix));
            }, 0);
        }
    });
};
