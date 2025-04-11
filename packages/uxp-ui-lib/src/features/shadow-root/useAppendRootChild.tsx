import { useCallback } from "react";
import { useShadowRoot } from "./ShadowRootContext";

export const useAppendRootChild = () => {
    const context = useShadowRoot();
    const root = context?.root ?? document;

    const append = useCallback(
        (node: HTMLElement) => {
            const container =
                "head" in root && root.head
                    ? root.head // Document
                    : root instanceof ShadowRoot
                        ? root      // ShadowRoot (styles/scripts go here)
                        : document.head;

            container.appendChild(node);

            // Return cleanup
            return () => container.removeChild(node);
        },
        [root]
    );

    return append;
};

