import { useCallback, useEffect, useState } from "react";

/**
 * Global Ctrl+K / Cmd+K listener for opening the command palette dialog.
 * When `enabled` is false (e.g., on the home page where the sticky command
 * bar handles Ctrl+K focus directly), this hook skips opening the dialog.
 */
export function useCommandPaletteShortcut(enabled: boolean) {
    const [open, setOpen] = useState(false);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;
        if ((event.ctrlKey || event.metaKey) && event.key === "k") {
            event.preventDefault();
            setOpen(true);
        }
    }, [enabled]);

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    const paletteClose = useCallback(() => setOpen(false), []);
    const paletteTrigger = useCallback(() => setOpen(true), []);

    return { paletteOpen: open, paletteClose, paletteTrigger };
}
