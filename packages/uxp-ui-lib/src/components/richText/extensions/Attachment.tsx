import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import AttachmentNode from '../nodes/AttachmentNode';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        attachment: {
            insertAttachment: (attrs: AttachmentAttributes) => ReturnType;
        };
    }
}


type AttachmentAttributes = {
    href: string;
    name: string;
    mimetype?: string;

};
type AttachmentOptions = {
    basePath: string
}

const Attachment = Node.create({
    name: 'attachment',
    group: 'inline',
    inline: true,
    atom: true,
    draggable: true,
    selectable: true,

    addOptions() {
        return {
            basePath: "",
        } as AttachmentOptions;
    },

    addAttributes() {
        return {
            name: { default: 'Untitled' },
            url: { default: '' },
            mimetype: { default: 'application/octet-stream' },
        };
    },

    parseHTML() {
        return [{
            tag: 'attachment-node',
            getAttrs: (dom) => ({
                name: (dom as HTMLElement).getAttribute('name') ?? '',
                url: (dom as HTMLElement).getAttribute('url') ?? '',
                mimetype: (dom as HTMLElement).getAttribute('mimetype') ?? '',
            }),
        }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['attachment-node', mergeAttributes(HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(AttachmentNode);
    },

    addCommands() {
        return {
            insertAttachment:
                (attrs) =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                            attrs,
                        });
                    },
        };
    },
});

export default Attachment;
