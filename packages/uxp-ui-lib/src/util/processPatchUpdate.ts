import { debounce } from "@mui/material";
import { AsyncThunk } from "@reduxjs/toolkit";

//export type UpdateThunk<T> = (payload: T) => Promise<any>;
export type UpdateThunk<T> = AsyncThunk<any, T, any>;
type CreateDebouncedUpdaterArgs<T> = {
    updateThunk: UpdateThunk<T>;
    errorHandler?: (error: any, payload: T) => void;
    successHandler?: (result: any, payload: T) => void;
    debounceWait?: number;
};
export const createDebouncedUpdater = <T>({
    updateThunk,
    errorHandler,
    successHandler,
    debounceWait = 500,
}: CreateDebouncedUpdaterArgs<T>) => {
    let isUpdating = false;
    let nextUpdate: T | null = null;

    const processPatchUpdate = async (dispatch: any, payload: T) => {
        if (isUpdating) {
            // Replace the queued update with the latest one
            nextUpdate = payload;
            return;
        }

        isUpdating = true;

        try {
            // Perform the current update
            await dispatch(updateThunk(payload))
                .unwrap()
                .then((result: any) => {
                    if (successHandler) {
                        successHandler(result, payload);
                    }
                })
                .catch((error: any) => {
                    if (errorHandler) {
                        errorHandler(error, payload);
                    }
                });

            // Check if there's a new update to process
            if (nextUpdate) {
                const latestUpdate = nextUpdate;
                nextUpdate = null; // Clear the queue
                await processPatchUpdate(dispatch, latestUpdate);
            }
        } finally {
            isUpdating = false;
        }
    };

    return debounce((dispatch: (thunk: UpdateThunk<T>) => Promise<any>, payload: T) => processPatchUpdate(dispatch, payload), debounceWait);
};
