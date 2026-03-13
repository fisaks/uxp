import { useCallback, useRef } from "react";
import { useParams } from "react-router-dom";

/**
 * Reads `:itemId` from the route, scrolls to the target tile when it mounts,
 * and provides a persistent `highlightedId` so the user can identify the tile.
 */
export function useDeepLinkHighlight() {
    const { itemId } = useParams<{ itemId: string }>();
    const scrolledRef = useRef(false);
    const targetElRef = useRef<HTMLElement | null>(null);

    /** Returns a ref callback for the matching tile, undefined for all others.
     *  When the highlighted tile mounts, auto-scrolls to it. */
    const highlightedTileRef = useCallback(
        (id: string) => {
            if (id !== itemId) return undefined;
            return (el: HTMLElement | null) => {
                if (!el) return;

                targetElRef.current = el;

                if (scrolledRef.current) return;
                scrolledRef.current = true;
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            };
        },
        [itemId]
    );

    /** Scroll back to the highlighted tile. */
    const scrollToHighlightedTile = useCallback(() => {
        targetElRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, []);

    return { highlightedTileId: itemId, highlightedTileRef, scrollToHighlightedTile };
}
