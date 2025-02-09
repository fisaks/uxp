import { AsyncThunkPayloadCreator, createAsyncThunk, createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ApiErrorResponse, AxiosUtil } from "@uxp/common";

type LoadingErrorState<T extends string> = {
    [actionName in T]: {
        loading: boolean;
        error: ApiErrorResponse | null;
        loaded: boolean;
    };
};

export const createLoadingErrorSlice = <T extends string, RootState>(actionNames: readonly T[], loadingError: keyof RootState) => {
    const initialState: LoadingErrorState<T> = actionNames.reduce((state, actionName) => {
        state[actionName] = {
            loading: false,
            error: null,
            loaded: false,
        };
        return state;
    }, {} as LoadingErrorState<T>);

    const slice = createSlice({
        name: "loadingError",
        initialState,
        reducers: {
            startLoading: (state, action: PayloadAction<T>) => {
                const actionName = action.payload;

                (state as LoadingErrorState<T>)[actionName].loading = true;
                (state as LoadingErrorState<T>)[actionName].error = null;
            },
            setError: (state, action: PayloadAction<{ actionName: T; error: ApiErrorResponse }>) => {
                const { actionName, error } = action.payload;
                (state as LoadingErrorState<T>)[actionName].loading = false;
                (state as LoadingErrorState<T>)[actionName].error = error;
            },
            setSuccess: (state, action: PayloadAction<T>) => {
                const actionName = action.payload;

                (state as LoadingErrorState<T>)[actionName].loading = false;
                (state as LoadingErrorState<T>)[actionName].error = null;
                (state as LoadingErrorState<T>)[actionName].loaded = true;
            },
            clear: (state, action: PayloadAction<T>) => {
                const actionName = action.payload;
                (state as LoadingErrorState<T>)[actionName].loading = false;
                (state as LoadingErrorState<T>)[actionName].error = null;
                (state as LoadingErrorState<T>)[actionName].loaded = false;
            },
        },
    });

    const createLoadingErrorAwareThunk = <Returned, Payload>(actionName: T, asyncFunction: AsyncThunkPayloadCreator<Returned, Payload>) => {
        return createAsyncThunk<Returned, Payload>(actionName, async (payload, thunkAPI) => {
            const { dispatch, rejectWithValue } = thunkAPI;
            dispatch(slice.actions.startLoading(actionName));

            try {
                const result = await asyncFunction(payload, thunkAPI);
                setTimeout(() => {
                    dispatch(slice.actions.setSuccess(actionName));
                }, 0);

                return result as Returned;
            } catch (error) {
                const apiError = AxiosUtil.getErrorResponse(error);
                setTimeout(() => {
                    dispatch(slice.actions.setError({ actionName, error: apiError }));
                }, 0);

                return rejectWithValue(error);
            }
        });
    };

    const selectLoadingErrorState = (state: RootState) => state[loadingError] as LoadingErrorState<T>;

    const selectActionIsLoading = (action: T) => createSelector(selectLoadingErrorState, (loadingState) => !!loadingState[action].loading);

    const selectActionError = (action: T) => createSelector(selectLoadingErrorState, (loadingState) => !!loadingState[action].error);

    const selectActionIsLoaded = (action: T) => createSelector(selectLoadingErrorState, (loadingState) => !!loadingState[action].loaded);

    return { slice, createLoadingErrorAwareThunk, selectActionIsLoading, selectActionError, selectActionIsLoaded };
};
