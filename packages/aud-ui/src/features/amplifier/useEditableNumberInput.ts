import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * A value that is shown as "value unit" and turns into a plain number input when focused.
 * Enter or leaving the input sends the typed value (and the text it was typed as), Escape cancels.
 * Same behaviour as the analog inputs in the UHN app.
 */
export function useEditableNumberInput(value: number, unit: string, send: (value: number, text: string) => void) {
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Show the current value while not editing
    useEffect(() => {
        if (!isEditing && inputRef.current) {
            inputRef.current.value = `${value} ${unit}`;
        }
    }, [value, unit, isEditing]);

    const handleFocus = useCallback(() => {
        setIsEditing(true);
        if (inputRef.current) {
            inputRef.current.value = String(value);
            inputRef.current.select();
        }
    }, [value]);

    const commitEdit = useCallback(() => {
        setIsEditing(false);
        const text = inputRef.current?.value ?? "";
        const parsed = parseFloat(text);
        if (!isNaN(parsed)) {
            send(parsed, text);
        }
    }, [send]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                inputRef.current?.blur();
            } else if (e.key === "Escape") {
                setIsEditing(false);
                if (inputRef.current) inputRef.current.value = String(value);
                inputRef.current?.blur();
            }
        },
        [value]
    );

    return { isEditing, inputRef, handleFocus, commitEdit, handleKeyDown };
}
