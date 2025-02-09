import Image, { ImageOptions } from "@tiptap/extension-image";
import { buildPath } from "@uxp/common";

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        resizableImage: {
            /**
             * Inserts an image with additional attributes
             */
            setImage: (options: { src: string; alt?: string; title?: string; width?: string; float?: string }) => ReturnType;
        };
    }
}

export const ResizableImage = Image.extend<ImageOptions & { basePath: string }, any>({
    addOptions() {
        return {
            ...this.parent?.(),
            basePath: "", // Default to an empty string (no base path)
        } as ImageOptions & { basePath: string };
    },
    addAttributes() {
        return {
            src: { default: null },
            alt: { default: "" },
            width: { default: "100%" }, // Default width
            draggable: { default: false }, // Allow dragging
            float: { default: "" },
        };
    },

    addNodeView() {
        return ({ node, editor }) => {
            const dom = document.createElement("div");
            dom.classList.add("resizable-image-wrapper");

            dom.style.float = node.attrs.float ?? "none";
            dom.style.margin = node.attrs.float === "left" ? "0 15px 0 0" : node.attrs.float === "right" ? "0 0 0 15px" : "0px";

            const img = document.createElement("img");

            img.src = buildPath(this.options.basePath, node.attrs.src);
            img.style.width = node.attrs.width;
            img.draggable = false;
            dom.appendChild(img);

            const handle = document.createElement("div");
            handle.classList.add("resize-handle");
            dom.appendChild(handle);

            let isResizing = false;
            let startX = 0;
            let startWidth = 0;

            const startResize = (event: MouseEvent | TouchEvent) => {
                event.preventDefault();
                isResizing = true;

                if ("touches" in event) {
                    startX = event.touches[0].clientX;
                } else {
                    startX = event.clientX;
                }
                startWidth = dom.offsetWidth;

                document.addEventListener("mousemove", resize);
                document.addEventListener("mouseup", stopResize);
                document.addEventListener("touchmove", resize, { passive: false });
                document.addEventListener("touchend", stopResize);
            };

            const resize = (event: MouseEvent | TouchEvent) => {
                if (!isResizing) return;
                event.preventDefault(); // Prevent scrolling while resizing

                let clientX;
                if ("touches" in event) {
                    clientX = event.touches[0].clientX;
                } else {
                    clientX = event.clientX;
                }

                const newWidth = Math.max(50, startWidth + (clientX - startX));
                img.style.width = `${newWidth}px`;

                editor.chain().updateAttributes("image", { width: `${newWidth}px` });
            };

            const stopResize = () => {
                isResizing = false;
                document.removeEventListener("mousemove", resize);
                document.removeEventListener("mouseup", stopResize);
                document.removeEventListener("touchmove", resize);
                document.removeEventListener("touchend", stopResize);
            };

            handle.addEventListener("mousedown", startResize);
            handle.addEventListener("touchstart", startResize, { passive: false });

            return {
                dom,
                contentDOM: img,
                update: (updatedNode) => {
                    if (updatedNode.attrs.src !== node.attrs.src) {
                        img.src = buildPath(this.options.basePath, node.attrs.src);
                    }
                    if (updatedNode.attrs.width !== node.attrs.width) {
                        img.style.width = updatedNode.attrs.width;
                    }
                    if (updatedNode.attrs.float !== node.attrs.float) {
                        dom.style.float = updatedNode.attrs.float;
                        dom.style.margin =
                            updatedNode.attrs.float === "left" ? "0 15px 0 0" : node.attrs.float === "right" ? "0 0 0 15px" : "0px";
                    }

                    return true;
                },
            };
        };
    },
});
