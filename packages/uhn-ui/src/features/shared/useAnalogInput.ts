import React, { useCallback, useEffect, useRef, useState } from "react";

type UseAnalogInputOptions = {
    /** Call e.stopPropagation() on Escape (needed inside Popovers) */
    stopEscapePropagation?: boolean;
};

export function useAnalogInput(
    localValue: number,
    unit: string,
    sendExact: (value: number) => void,
    options?: UseAnalogInputOptions,
) {
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync displayed value when not editing
    useEffect(() => {
        if (!isEditing && inputRef.current) {
            inputRef.current.value = `${localValue}${unit ? ` ${unit}` : ""}`;
        }
    }, [localValue, unit, isEditing]);

    const handleFocus = useCallback(() => {
        setIsEditing(true);
        if (inputRef.current) {
            inputRef.current.value = String(localValue);
            inputRef.current.select();
        }
    }, [localValue]);

    const commitEdit = useCallback(() => {
        setIsEditing(false);
        const parsed = parseFloat(inputRef.current?.value ?? "");
        if (!isNaN(parsed)) {
            sendExact(parsed);
        }
    }, [sendExact]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            inputRef.current?.blur();
        } else if (e.key === "Escape") {
            if (options?.stopEscapePropagation) e.stopPropagation();
            setIsEditing(false);
            if (inputRef.current) inputRef.current.value = String(localValue);
            inputRef.current?.blur();
        }
    }, [localValue, options?.stopEscapePropagation]);

    return { isEditing, inputRef, handleFocus, commitEdit, handleKeyDown };
}
