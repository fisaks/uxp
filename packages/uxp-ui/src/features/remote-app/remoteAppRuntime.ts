import { RemoteAppRuntimeInstance, RemoteAppRuntimeOptions } from "./remote-app.types";


const fetchPromises: Record<string, Promise<unknown>> = {};

// Defer cleanup until after React unmount completes
const deferCleanup = (fn: () => void) => setTimeout(fn, 0);

export function createRemoteAppRuntime(options: RemoteAppRuntimeOptions): RemoteAppRuntimeInstance {
    let shadowRoot: ShadowRoot | null = null;
    let cleanupFn: (() => void) | null = null;
    let unmounted = false;

    const attachShadowRoot = (): ShadowRoot => {
        const existing = options.container.shadowRoot;
        if (existing) return existing;
        return options.container.attachShadow({ mode: "open" });
    };

    const clearShadowRoot = (root: ShadowRoot) => {
        // clear previous content
        root.innerHTML = "";
    };

    const parseHtml = (html: string): Document => {
        const parser = new DOMParser();
        return parser.parseFromString(html, "text/html");
    };

    const maybeInjectBasePath = (node: Node): Node => {
        if (!options.basePath) return node;

        if (node.nodeName === "DIV") {
            const el = node as HTMLElement;
            if (el.hasAttribute("data-uxp-app-identifier")) {
                const clone = el.cloneNode(true) as HTMLElement;
                clone.setAttribute("data-base-route-path", options.basePath);
                return clone;
            }
        }
        return node;
    };

    const injectScript = (scriptElement: HTMLScriptElement, target: ShadowRoot) => {
        const newScript = document.createElement("script");

        if (scriptElement.src) {
            // Handle external scripts
            newScript.src = scriptElement.src;
        } else {
            // Handle inline scripts
            newScript.textContent = scriptElement.textContent;
        }

        // copy attributes (including type/module, data-*)
        Array.from(scriptElement.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
        });

        // Special handling: data-uxp-remote-app bundle scripts
        if (scriptElement.src && scriptElement.dataset.uxpRemoteApp !== undefined) {
            const remoteApp = scriptElement.dataset.uxpRemoteApp;

            // if already present, mark promise as resolved
            if (window[remoteApp]) {
                fetchPromises[remoteApp] = Promise.resolve();
            } else if (!fetchPromises[remoteApp]) {
                fetchPromises[remoteApp] = new Promise<void>((resolve) => {
                    newScript.onload = () => resolve();
                    target.appendChild(newScript);
                });
            }

            fetchPromises[remoteApp].then(() => {
                if (unmounted) return;
                const cleanup = window[remoteApp]?.initApplication(target);
                if (typeof cleanup === "function") cleanupFn = cleanup;
            });
        } else {
            target.appendChild(newScript);
        }
    };

    const appendNodes = (nodes: NodeListOf<ChildNode> | ChildNode[], target: ShadowRoot) => {
        Array.from(nodes).forEach((node) => {
            if (node.nodeName === "SCRIPT") {
                injectScript(node as HTMLScriptElement, target);
                return;
            }

            // Clone into shadow root
            const cloned = node.cloneNode(true);

            // Apply basePath/contentId injection rule (only on certain divs)
            const finalNode = maybeInjectBasePath(cloned);

            target.appendChild(finalNode);
        });
    };

    const mount = () => {
        unmounted = false;

        if (options.visible === false) {
            // ensure it cannot flash
            options.container.style.display = "none";
        } else {
            // preserve existing behavior: caller can toggle visibility
            // we won't force anything here
        }

        shadowRoot = attachShadowRoot();
        clearShadowRoot(shadowRoot);

        const doc = parseHtml(options.html);

        // HEAD
        appendNodes(doc.head.childNodes, shadowRoot);

        // BODY
        appendNodes(doc.body.childNodes, shadowRoot);
    };

    const unmount = () => {
        unmounted = true;

        // Your original behavior: run cleanup async
        if (cleanupFn) {
            const fn = cleanupFn;
            cleanupFn = null;
            deferCleanup(() => fn());
        }

        // Optional: clear shadow root so UI disappears quickly
        if (shadowRoot) {
            // clearing is safe; scripts already executed in document context
            shadowRoot.innerHTML = "";
        }
    };

    return { mount, unmount };
}