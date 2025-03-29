import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import AttachmentNode from '../nodes/AttachmentNode';
import { findNodeById } from './extensionUtil';
import { UploadPlaceholder } from './UploadPlaceholder';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        attachment: {
            insertAttachment: (attrs: AttachmentAttributes) => ReturnType;
            insertAttachmentAtPlaceholder: (id: string, attrs: AttachmentAttributes) => ReturnType;
        };
    }
}


type AttachmentAttributes = {
    url: string;
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
            insertAttachmentAtPlaceholder: (id, attrs) => ({ state, dispatch }) => {
                const pos = findNodeById(state, id, UploadPlaceholder.name);

                if (pos === null) return false;

                const placeholderNode = state.doc.nodeAt(pos);
                if (!placeholderNode || placeholderNode.type.name !== UploadPlaceholder.name) return false;

                const attachmentNode = state.schema.nodes.attachment.create(attrs);

                const tr = state.tr.replaceWith(pos, pos + 1, attachmentNode);

                if (dispatch) {
                    dispatch(tr);
                }

                return true;

            },

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
