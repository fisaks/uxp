import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Makes an element behave as sticky by switching to position:fixed
 * when it scrolls past a threshold. Works inside Shadow DOM where
 * CSS position:sticky doesn't function because the scroll container
 * (document body) is outside the Shadow DOM boundary.
 *
 * Returns a ref for the sticky box element and the current fixed state.
 * The sticky box stays in the document flow to prevent layout jumps.
 */
export function useStickyOnScroll(topOffset: number = 64) {
    const stickyBoxRef = useRef<HTMLDivElement>(null);
    // When true the element has scrolled past topOffset — the caller should
    // render a position:fixed clone and hide the in-flow original (keep it in
    // the DOM to preserve layout height and provide the measurement rect).
    const [isFixed, setIsFixed] = useState(false);
    const [width, setWidth] = useState<number | undefined>(undefined);

    const measure = useCallback(() => {
        const el = stickyBoxRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setIsFixed(rect.top < topOffset);
        setWidth(el.offsetWidth);
    }, [topOffset]);

    useEffect(() => {
        measure();
        window.addEventListener("scroll", measure, { passive: true });
        window.addEventListener("resize", measure, { passive: true });
        return () => {
            window.removeEventListener("scroll", measure);
            window.removeEventListener("resize", measure);
        };
    }, [measure]);

    return { stickyBoxRef, isFixed, fixedWidth: width };
}
