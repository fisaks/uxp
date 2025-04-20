import { createContext, useContext } from "react";


type ShadowRootContextType = {
    root: ShadowRoot | Document
    type: "shadow" | "document"
    portalRef: React.RefObject<HTMLDivElement>;
}
export const ShadowRootContext = createContext<ShadowRootContextType | null>(null);

export const useShadowRoot = () => useContext(ShadowRootContext);

export const useApplicationBodyRoot = () => {
    const context = useShadowRoot();
    console.log("context", (context?.root as ShadowRoot)?.host);
    return context?.type === "shadow" ? (context?.root as ShadowRoot)?.host : (context?.root as Document).body;
}

export const useApplicationHeadRoot = () => {
    const context = useShadowRoot();
    return context?.type === "shadow" ? (context?.root as ShadowRoot)?.host : (context?.root as Document).head;
}

export const usePortalContainer = () => {
    const context = useShadowRoot();
    return context!.portalRef.current;
}
export const usePortalContainerRef = () => {
    const context = useShadowRoot();
    return context!.portalRef;
}