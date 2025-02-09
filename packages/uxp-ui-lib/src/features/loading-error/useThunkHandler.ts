import { AsyncThunk, ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import { ApiErrorResponse, AxiosUtil } from "@uxp/common";
import { useEffect, useRef, useState } from "react";

/**
 * A reusable hook for handling async thunks with loading, error, and success (loaded) states.
 * @param thunk - The async thunk to be executed.
 * @param dispatch - The Redux dispatch function.
 * @param successDuration - How long to keep the `loaded` flag true after success (in ms).
 * @returns [run, loading, error, loaded] - A function to execute the thunk and its states.
 */
export const useThunkHandler = <Returned, Payload = void, RootState = any>(
    thunk: AsyncThunk<Returned, Payload, {}>,
    dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
    successDuration: number = 2000 // Default to 2 seconds
): [
        (payload: Payload) => Promise<Returned | undefined>,
        boolean, // loading
        ApiErrorResponse | null, // error
        boolean // loaded
    ] => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<ApiErrorResponse | null>(null);
    const [loaded, setLoaded] = useState(false);

    const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const clearSuccessTimeout = () => {
        if (successTimeoutRef.current) {
            clearTimeout(successTimeoutRef.current);
            successTimeoutRef.current = null;
        }
    };

    const run = async (payload: Payload): Promise<Returned | undefined> => {
        setLoading(true);
        setError(null);
        setLoaded(false);
        clearSuccessTimeout();
        try {
            const result = await dispatch(thunk(payload)).unwrap();
            setTimeout(() => setLoaded(true), 0);

            // Automatically reset `loaded` after the specified duration
            successTimeoutRef.current = setTimeout(() => {
                setLoaded(false);
            }, successDuration);

            return result;
        } catch (e) {
            const err = AxiosUtil.getErrorResponse(e);
            setError(err);
            return undefined;
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        return () => {
            clearSuccessTimeout();
        };
    }, []);

    return [run, loading, error, loaded];
};
