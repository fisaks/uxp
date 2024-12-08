type Action = {
    type: string;
    payload: any;
    meta?: any;
    error?: any;
};

// Simplified result handler without promises
export const handleThunkResult = <Payload = unknown>(
    onSuccess: (payload: Payload) => Promise<void> | void, // Success callback
    onError?: (error: any, payload: any) => Promise<void> | void, // Optional error callback
    onFinally?: () => Promise<void> | void // Optional finally callback
) => {
    return async (action: Action) => {
        // Handle fulfilled state
        if (action.type.endsWith("/fulfilled")) {
            await onSuccess(action.payload as Payload);
        }

        // Handle rejected state (if onError callback is provided)
        if (action.type.endsWith("/rejected") && onError) {
            console.log(action);
            await onError(action.error, action.payload);
        }

        // Handle finalization (always runs)
        if (onFinally) {
            await onFinally();
        }
        return action;
    };
};
