import { createLoadingErrorSlice } from "@uxp/ui-lib";

const actionNames = ["houses/fetch"] as const;
export type AppGlobalActionNames = (typeof actionNames)[number];

const { createLoadingErrorAwareThunk, selectActionError, selectActionIsLoaded, selectActionIsLoading, slice } = createLoadingErrorSlice(
    actionNames,
    "loadingError"
);

export { createLoadingErrorAwareThunk, selectActionError, selectActionIsLoaded, selectActionIsLoading };
export default slice.reducer;
