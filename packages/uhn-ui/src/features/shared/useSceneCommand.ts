import { useCallback, useEffect, useRef, useState } from "react";
import { useSendSceneCommand } from "../scene/hooks/useSendSceneCommand";

/** Handles click interaction for scene tiles.
 *  Sends the scene activation command and maintains a brief pending state
 *  (auto-clears after 1s) since scenes have no state feedback. */
export function useSceneCommand(sceneId: string) {
    const sendSceneCommand = useSendSceneCommand();
    const [pending, setPending] = useState(false);
    const pendingTimer = useRef<ReturnType<typeof setTimeout>>();

    const handleClick = useCallback(async () => {
        setPending(true);
        try {
            await sendSceneCommand(sceneId);
        } finally {
            pendingTimer.current = setTimeout(() => setPending(false), 1000);
        }
    }, [sceneId, sendSceneCommand]);

    useEffect(() => {
        return () => {
            if (pendingTimer.current) clearTimeout(pendingTimer.current);
        };
    }, []);

    return { handleClick, pending };
}
