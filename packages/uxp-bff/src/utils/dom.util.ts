import { buildPath, RemoteAppConfiguration, removeContextPath } from "@uxp/common";
import { JSDOM } from "jsdom";

export function rewriteAppEntryDom(
    { html, config }: { html: string, config: RemoteAppConfiguration }
): string {
    const { appIdentifier, contentId, config: { contextPath, appOption } } = config;
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const rewriteUrl = (url: string): string => {
        if (url.startsWith("http") || url.startsWith("//")) return url; // Absolute URLs
        return buildPath("/api/content/resource", appIdentifier, removeContextPath(url, contextPath));
    };

    document.querySelectorAll("script:not([src])").forEach((script) => {
        if (script.getAttribute("data-uxp-remove") === "true") {
            script.remove();
        }
    });

    // Update script, link,
    document.querySelectorAll("script[src]").forEach((script) => {
        if (script.getAttribute("data-uxp-remove") === "true") {
            script.remove();
        } else {
            script.setAttribute("src", rewriteUrl(script.getAttribute("src")!));
        }
    });
    document.querySelectorAll("link[href]").forEach((link) => {
        if (link.getAttribute("data-uxp-remove") === "true") {
            link.remove();
        } else {
            link.setAttribute("href", rewriteUrl(link.getAttribute("href")!));
        }
    });


    const divs = document.querySelectorAll("body div");

    // Iterate over all divs
    divs.forEach((div) => {
        // data-base-url is required for the root div of the remote app
        if (div.hasAttribute("data-base-url")) {
            // Get all attributes of the div
            Array.from(div.attributes).forEach((attr) => {
                // Check if the attribute name starts with "data-base-url"
                if (attr.name.startsWith("data-base-url")) {
                    // Rewrite the attribute value
                    const originalValue = attr.value;
                    div.setAttribute(
                        attr.name,
                        buildPath("/api/content/resource", appIdentifier, removeContextPath(originalValue, contextPath))
                    );
                }
                if (attr.name.startsWith("data-ws-path")) {
                    div.setAttribute(
                        attr.name,
                        buildPath("/ws-api", appIdentifier)
                    );
                }
            });
            // Additionally the data-base-route-path attribute is set in RemoteApp.tsx
            // which point to the current base navigation path of the page
            if (contentId) div.setAttribute("data-uxp-content-id", contentId);
            div.setAttribute("data-uxp-app-identifier", appIdentifier);

            if (appOption) {
                // Existing appOption is overwritten
                div.setAttribute("data-app-option", JSON.stringify(appOption));
            }

        }

    });
    return dom.serialize();

}
