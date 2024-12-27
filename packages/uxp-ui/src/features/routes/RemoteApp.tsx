import { Loading } from "@uxp/ui-lib";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";

interface RemoteAppProps {
    uuid: string;
}

declare global {
    interface Window {
        [key: `${string}`]: {
            initApplication: (container: ShadowRoot | HTMLElement) => void;
        };
    }
}

const fetchPromises: Record<string, Promise<any>> = {};

const RemoteApp: React.FC<RemoteAppProps> = ({ uuid }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        const fetchAndRenderApp = async () => {
            if (!containerRef.current) return;

            try {
                // Fetch the index.html using Axios
                const response = await axios.get(`/api/content/index/${uuid}`, {
                    headers: {
                        "Content-Type": "text/html",
                    },
                });

                const html = response.data;

                // Create or re-use the shadow DOM
                let shadowRoot = containerRef.current.shadowRoot;
                if (!shadowRoot) {
                    shadowRoot = containerRef.current.attachShadow({ mode: "open" });
                }

                // Clear previous content
                shadowRoot.innerHTML = "";

                // Parse the fetched HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, "text/html");
                let currentApp: string = "";
                // Function to handle <script> tags and inject into the main document
                const injectScript = (scriptElement: HTMLScriptElement, target: HTMLElement | ShadowRoot) => {
                    const newScript = document.createElement("script");

                    if (scriptElement.src) {
                        // Handle external scripts
                        newScript.src = scriptElement.src;
                    } else {
                        // Handle inline scripts
                        newScript.textContent = scriptElement.textContent;
                    }

                    // Copy other attributes
                    Array.from(scriptElement.attributes).forEach((attr) =>
                        newScript.setAttribute(attr.name, attr.value)
                    );

                    if (scriptElement.src && scriptElement.dataset.uxpRemoteApp !== undefined) {
                        const remoteApp = scriptElement.dataset.uxpRemoteApp;
                        currentApp = remoteApp;
                        // Special handling for scripts with the "uxp-remote-app" data attribute
                        if (window[remoteApp]) {
                            fetchPromises[remoteApp] = Promise.resolve();
                        } else if (!fetchPromises[remoteApp]) {
                            fetchPromises[remoteApp] = new Promise<void>((resolve) => {
                                newScript.onload = () => {
                                    resolve();
                                };
                                target.appendChild(newScript);
                            });
                        }
                        fetchPromises[remoteApp].then(() => {
                            window[remoteApp].initApplication(shadowRoot);
                        });
                    } else {
                        console.log("Adding script:", uuid);
                        target.appendChild(newScript);
                    }
                };

                // Append <head> elements to the shadow DOM (excluding scripts)
                Array.from(doc.head.childNodes).forEach((node) => {
                    if (node.nodeName === "SCRIPT") {
                        injectScript(node as HTMLScriptElement, shadowRoot); // Inject into document.head
                    } else {
                        shadowRoot!.appendChild(node.cloneNode(true));
                    }
                });

                Array.from(doc.body.childNodes).forEach((node) => {
                    if (node.nodeName === "SCRIPT") {
                        injectScript(node as HTMLScriptElement, shadowRoot); // Inject into document.body
                    } else {
                        shadowRoot!.appendChild(node.cloneNode(true));
                    }
                });

                // Move all styles with data-uxp-app into the shadow DOM
                /*                const copyStylesToShadowDom = () => {
                                    document.querySelectorAll(`style[data-uxp-app="${currentApp}"], link[data-uxp-app="${currentApp}"]`).forEach((styleNode) => {
                                        let styleId = styleNode.getAttribute('data-uxp-style-id');
                                        if (!styleId) {
                                            styleId = crypto.randomUUID();
                                            styleNode.setAttribute('data-uxp-style-id', styleId);
                                        }
                
                                        if (shadowRoot.querySelectorAll(`style[data-uxp-style-id="${styleId}"], link[data-uxp-style-id="${styleId}"]`).length === 0) {
                                            console.log('Copying style to shadow:', uuid);
                                            shadowRoot.appendChild(styleNode.cloneNode(true)); // Clone and append to shadow DOM
                                        }
                
                                    });
                                };
                
                                // Initial move
                                copyStylesToShadowDom();
                
                                // Observe the head for dynamically added styles
                                const observer = new MutationObserver(() => {
                                    copyStylesToShadowDom();
                                });
                
                                observer.observe(document.head, {
                                    childList: true,
                                    subtree: true,
                                });*/
            } catch (error) {
                console.error(`Error fetching or rendering remote app:`, error);
            } finally {
                setTimeout(() => setLoaded(true), 0);
            }
        };

        fetchAndRenderApp();
    }, [uuid]); // Refetch when UUID changes

    return (
        <>
            {!loaded && <Loading fullHeight={false} />}
            <div
                id={`remote-app-${uuid}`}
                ref={containerRef}
                style={{ visibility: loaded ? "visible" : "hidden" }}
            ></div>
        </>
    );
};

export default RemoteApp;
