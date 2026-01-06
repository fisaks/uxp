// useRemoteAppRuntime.ts
import { useEffect, useRef, useState } from "react";
import { RemoteAppRuntimeInstance } from "./remote-app.types";
import { createRemoteAppRuntime } from "./remoteAppRuntime";

type UseRemoteAppRuntimeOptions = {
    fetchHtml: () => Promise<string>;
    basePath?: string;
    contentId?: string;
    visible?: boolean;
};

export function useRemoteAppRuntime(options: UseRemoteAppRuntimeOptions) {
    const containerRef = useRef<HTMLDivElement>(null);
    const runtimeRef = useRef<RemoteAppRuntimeInstance | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<unknown>(null);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!containerRef.current) return;

            setLoaded(false);
            setError(null);

            try {
                const html = await options.fetchHtml();
                if (cancelled) return;

                runtimeRef.current?.unmount();
                runtimeRef.current = createRemoteAppRuntime({
                    html,
                    container: containerRef.current,
                    basePath: options.basePath,
                    contentId: options.contentId,
                    visible: options.visible,
                });

                runtimeRef.current.mount();

                // mimic your "setTimeout(() => setContentLoaded(true), 0)"
                setTimeout(() => {
                    if (!cancelled) setLoaded(true);
                }, 0);
            } catch (e) {
                if (!cancelled) setError(e);
            }
        }

        run();

        return () => {
            cancelled = true;
            runtimeRef.current?.unmount();
            runtimeRef.current = null;
        };
    }, [options.basePath, options.contentId, options.fetchHtml, options.visible]);

    return { containerRef, loaded, error };
}
