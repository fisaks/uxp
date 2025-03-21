import { Node, mergeAttributes } from "@tiptap/core";
import { buildPath } from "@uxp/common";

type VideoAttributes = {
    src: string;
    controls?: boolean;
    autoplay?: boolean;
    loop?: boolean;
};

type VideoOptions = {
    basePath: string
}
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        video: {
            /**
             * Inserts an image with additional attributes
             */
            setVideo: (options: VideoAttributes) => ReturnType;

        };
    }
}

export const Video = Node.create({
    name: "video",
    group: "block",
    atom: true,
    addOptions() {
        return {
            basePath: "", // ✅ Default base path
        } as VideoOptions;
    },

    addAttributes() {
        return {
            src: { default: null },
            controls: { default: true },
            autoplay: { default: false },
            loop: { default: false },
        };
    },

    parseHTML() {
        return [{ tag: "video" }];
    },

    renderHTML({ node, HTMLAttributes }) {
        const { src, ...attrs } = HTMLAttributes;
        const fullSrc = buildPath(this.options.basePath, src);


        return ["video", mergeAttributes(attrs, { src: fullSrc })];
    },
    addCommands() {
        return {
            setVideo:
                (options) =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: "video",
                            attrs: options,
                        });
                    },
        };
    },
});
