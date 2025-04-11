import { useRef } from "react";
import { ShadowRootContext } from "./ShadowRootContext";

type ShadowRootProviderProps = {
    documentRoot: ShadowRoot | Document
    children: React.ReactNode;
}
export const ShadowRootProvider = ({ documentRoot, children }: ShadowRootProviderProps) => {

    const type = documentRoot instanceof Document ? "document" : "shadow";
    const internalPortalRef = useRef<HTMLDivElement>(null);

    return <ShadowRootContext.Provider value={{ root: documentRoot, type, portalRef: internalPortalRef }}>
        {children}
        <div ref={internalPortalRef} />
    </ShadowRootContext.Provider>
}


