import { useEffect } from "react";
import { ErrorCodeMessageMap, mapApiErrorsToMessageString } from "../util/browserErrorMessage";
import { useSafeState } from "./useSafeState";

type UseAsyncDataOptions = {
    errorCodeMessage?: ErrorCodeMessageMap
}
type UseAsyncDataParams<TInput, TResult> = {
    input: TInput | undefined;
    fetch: undefined | ((input: TInput | undefined) => Promise<TResult>)
    options?: UseAsyncDataOptions
};

type UseAsyncDataOnMountParams<TResult> = {
    fetch?: () => Promise<TResult>;
    options?: UseAsyncDataOptions
};

type UseAsyncDataResult<TResult> = {
    loading: boolean;
    error: string | undefined;
    data: TResult | undefined;
};


type UseAsyncManualLoadResult<TResult> = {
    loading: boolean;
    error: string | undefined;
    data: TResult | undefined;
    load: () => Promise<void>;
    reset: () => void;
};

type UseAsyncManualWithPayloadLoadResult<TResult, TPayload> = {
    loading: boolean;
    error: string | undefined;
    data: TResult | undefined;
    load: (payload: TPayload) => Promise<TResult | undefined>;
    reset: () => void;
};

export function useAsyncData<TInput, TResult>({
    input,
    fetch,
    options
}: UseAsyncDataParams<TInput, TResult>): UseAsyncDataResult<TResult> {
    const [loading, setLoading] = useSafeState(false);
    const [error, setError] = useSafeState<string | undefined>(undefined);
    const [data, setData] = useSafeState<TResult | undefined>(undefined);

    useEffect(() => {
        if (!input || !fetch) return;
        setLoading(true);
        setError(undefined);
        setData(undefined);

        fetch(input).
            then((result) => {
                setData(result);
            }).
            catch((err) => {
                setError(mapApiErrorsToMessageString(err, options?.errorCodeMessage));
            }).
            finally(() => {
                setLoading(false);
            });


    }, [input]);

    return { loading, error, data };
}


export function useAsyncDataOnMount<TResult>({
    fetch,
    options
}: UseAsyncDataOnMountParams<TResult>): UseAsyncDataResult<TResult> {
    const [loading, setLoading] = useSafeState(false);
    const [error, setError] = useSafeState<string | undefined>(undefined);
    const [data, setData] = useSafeState<TResult | undefined>(undefined);

    useEffect(() => {
        if (!fetch) return;
        setLoading(true);
        setError(undefined);
        setData(undefined);

        fetch().
            then((result) => {
                setData(result);
            }).
            catch((err) => {
                setError(mapApiErrorsToMessageString(err, options?.errorCodeMessage));
            }).
            finally(() => {
                setLoading(false);
            });


    }, []);

    return { loading, error, data };
}


export function useAsyncManualLoad<TResult>(
    fetch?: () => Promise<TResult>,
    options?: UseAsyncDataOptions
): UseAsyncManualLoadResult<TResult> {
    const [loading, setLoading] = useSafeState(false);
    const [error, setError] = useSafeState<string | undefined>(undefined);
    const [data, setData] = useSafeState<TResult | undefined>(undefined);

    const load = async () => {
        if (!fetch) return;
        setLoading(true);
        setError(undefined);
        setData(undefined);

        try {
            const result = await fetch();
            setData(result);
        } catch (err) {
            setError(mapApiErrorsToMessageString(err, options?.errorCodeMessage));
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setLoading(false);
        setError(undefined);
        setData(undefined);
    };

    return { loading, error, data, load, reset };
}



export function useAsyncManualLoadWithPayload<TResult, TPayload>(
    fetch?: (payload: TPayload) => Promise<TResult>,
    options?: UseAsyncDataOptions
): UseAsyncManualWithPayloadLoadResult<TResult, TPayload> {
    const [loading, setLoading] = useSafeState(false);
    const [error, setError] = useSafeState<string | undefined>(undefined);
    const [data, setData] = useSafeState<TResult | undefined>(undefined);

    const load = async (payload: TPayload) => {
        if (!fetch) return;
        setLoading(true);
        setError(undefined);
        setData(undefined);

        try {
            const result = await fetch(payload);
            setData(result);
            return result;
        } catch (err) {
            setError(mapApiErrorsToMessageString(err, options?.errorCodeMessage));
            return undefined;
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setLoading(false);
        setError(undefined);
        setData(undefined);
    };

    return { loading, error, data, load, reset };
}
