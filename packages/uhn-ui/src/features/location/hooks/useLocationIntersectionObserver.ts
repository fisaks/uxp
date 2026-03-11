import { useEffect, useRef, useState } from "react";
import { STICKY_OFFSET } from "../locationConstants";

type SectionRefMap = Record<string, HTMLDivElement | null>;

/**
 * Observes location section elements and returns the ID of the most visible one (with highest ratio).
 * Used to keep the location switcher dropdown in sync with scroll position.
 */
export function useLocationIntersectionObserver(
    sectionRefs: React.MutableRefObject<SectionRefMap>,
    locationIds: string[],
): string | undefined {
    const [activeId, setActiveId] = useState<string | undefined>(undefined);
    const ratioMap = useRef<Record<string, number>>({});

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const id = entry.target.getAttribute("data-location-id");
                    if (id) {
                        //entry.intersectionRatio — a number from 0 to 1 indicating how much of the element is visible (0 = fully off-screen, 1 = fully visible)
                        ratioMap.current[id] = entry.intersectionRatio;
                    }
                }
                let bestId: string | undefined;
                let bestRatio = 0;
                for (const id of locationIds) {
                    const ratio = ratioMap.current[id] ?? 0;
                    if (ratio > bestRatio) {
                        bestRatio = ratio;
                        bestId = id;
                    }
                }
                if (bestId) {
                    setActiveId(bestId);
                }
            },
            {
                threshold: [0, 0.25, 0.5, 0.75, 1.0],
                rootMargin: `-${STICKY_OFFSET}px 0px 0px 0px`,
            },
        );

        for (const id of locationIds) {
            const el = sectionRefs.current[id];
            if (el) observer.observe(el);
        }

        return () => observer.disconnect();
    }, [locationIds, sectionRefs]);

    return activeId;
}
