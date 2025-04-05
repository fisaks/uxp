import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

/**
 * A safe version of React's `useState` that avoids setting state after the component is unmounted.
 *
 * Useful in asynchronous flows, debounced inputs, or when you don't control when `setState` gets called.
 *
 * @template T The type of the state value.
 * @param initialState - The initial state value or a function that returns it.
 * @returns A tuple with the current state and a safe `setState` function.
 *
 * @example
 * const [loading, setLoading] = useSafeState(false);
 *
 * useEffect(() => {
 *   fetchData().then(() => {
 *     setLoading(false); // This won't error even if the component unmounted
 *   });
 * }, []);
 */
export function useSafeState<T>(
    initialState: T | (() => T)
): [T, Dispatch<SetStateAction<T>>] {
    const [state, setState] = useState<T>(initialState);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const safeSetState: Dispatch<SetStateAction<T>> = (value) => {
        if (isMountedRef.current) {
            setState(value);
        }
    };

    return [state, safeSetState];
}
