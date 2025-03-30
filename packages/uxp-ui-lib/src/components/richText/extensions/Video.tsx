import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { buildPath } from "@uxp/common";
import VideoNode from "../nodes/VideoNode";
import { findNodeById } from "./extensionUtil";
import { UploadPlaceholder } from "./UploadPlaceholder";
import { AlignmentStyles } from "../nodes/utils/videoHelpers";

type VideoAttributes = {
    src: string;
    controls?: boolean;
    autoplay?: boolean;
    loop?: boolean;
    width?: number | string;
    height?: number | string;
    align?: "left" | "center" | "right";
};

type VideoOptions = {
    basePath: string
}
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        video: {
            setVideo: (attrs: VideoAttributes) => ReturnType;
            insertVideoAtPlaceholder: (id: string, attrs: VideoAttributes) => ReturnType;
        };
    }
}
export const removeBasePath = (basePath: string, src: string) => {
    try {
        const url = new URL(src, window.location.origin);
        const fullBase = new URL(buildPath(basePath, "/"), window.location.origin).toString();

        if (url.toString().startsWith(fullBase)) {
            const p = decodeURIComponent(url.pathname.replace(basePath, ""));
            return p.startsWith("/") ? p.slice(1) : p;
        }
    } catch {
    }

    return src;
}
export const Video = Node.create({
    name: "video",
    group: "block",
    atom: true,
    draggable: true,
    selectable: true,
    addOptions() {
        return {
            basePath: "",
        } as VideoOptions;
    },

    addAttributes() {
        return {
            src: {
                default: null, parseHTML: (element) => {
                    let cleanSrc = element.getAttribute("src") ?? "";
                    return removeBasePath(this.options.basePath, cleanSrc);
                }
            },
            controls: {
                default: true,
            },
            autoplay: {
                default: false,
            },
            loop: {
                default: false,
            },
            width: { default: null, },
            height: { default: null, },
            aspectLocked: { default: true },
            aspectRatio: { default: 16 / 9 },
            align: {
                default: "center",
                parseHTML: (element) => element.getAttribute("data-align") || "center",
                renderHTML: (attrs) => {
                    return { "data-align": attrs.align };
                },
            },
        };
    },

    parseHTML() {
        return [{
            tag: "video",
        }];
    },

    renderHTML({ node, HTMLAttributes }) {
        const { src, align, ...attrs } = HTMLAttributes;
        const fullSrc = buildPath(this.options.basePath, src);

        return ["video", mergeAttributes(attrs, {
            src: fullSrc,
            style: AlignmentStyles[align || "center"],
        })];
    },
    addCommands() {
        return {
            insertVideoAtPlaceholder: (id, attrs) => ({ state, dispatch }) => {
                const pos = findNodeById(state, id, UploadPlaceholder.name);

                if (pos === null) return false;

                const placeholderNode = state.doc.nodeAt(pos);
                if (!placeholderNode || placeholderNode.type.name !== UploadPlaceholder.name) return false;

                const videoNode = state.schema.nodes.video.create(attrs);

                const tr = state.tr.replaceWith(pos, pos + 1, videoNode);

                if (dispatch) {
                    dispatch(tr);
                }

                return true;

            },
            setVideo:
                (attrs) =>
                    ({ commands }) => {
                        return commands.insertContent([
                            {
                                type: "video",
                                attrs: attrs,
                            },
                            {
                                type: "paragraph",
                            },
                        ]);
                    },
        };
    },


    addNodeView() {

        return ReactNodeViewRenderer(VideoNode);
    },

});
