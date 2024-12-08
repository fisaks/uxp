import { ApiErrorResponse, AxiosUtil, ErrorDetail } from "@uxp/common";

interface HandleErrorsOptions {
    error: unknown; // The error thrown by the API
    rejectWithValue: (args: unknown) => unknown; // The Redux Toolkit rejectWithValue function
    localErrorCodes: string[]; // List of error codes considered "local"
}

export const handleLocalErrors = <R>({ error, rejectWithValue, localErrorCodes }: HandleErrorsOptions): R => {
    if (AxiosUtil.isAxiosErrorWithErrorResponse(error)) {
        console.log("isErrorResponse");
        const localErrors: ErrorDetail[] = [];
        const globalErrors: ErrorDetail[] = [];

        const errorResponse: ApiErrorResponse = error.response?.data as ApiErrorResponse;
        // Separate errors into local and global
        errorResponse.errors.forEach((e) => {
            if (localErrorCodes.includes(e.code)) {
                localErrors.push(e);
            } else {
                globalErrors.push(e);
            }
        });

        // Handle local errors
        if (localErrors.length > 0) {
            console.log("isErrorResponse local");
            return rejectWithValue({ ...errorResponse, errors: localErrors }) as R;
        }

        // Throw global errors
        if (globalErrors.length > 0) {
            console.log("isErrorResponse global");
            throw { ...errorResponse, errors: globalErrors };
        }
    }
    console.log("isErrorResponse not know");
    // Throw unexpected errors
    throw error;
};
