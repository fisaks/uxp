import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import UploadPlaceholderNode from '../nodes/UploadPlaceholderNode';
import { findNodeById } from './extensionUtil';

export interface UploadPlaceholderOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        uploadPlaceholder: {
            insertUploadPlaceholder: (attrs: UploadPlaceholderAttrs) => ReturnType;
            updateUploadPlaceholder: (id: string, attrs: Partial<UploadPlaceholderAttrs>) => ReturnType;
            removeUploadPlaceholder: (id: string) => ReturnType;
        };
    }
}

export type UploadPlaceholderAttrs = {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    status: 'uploading' | 'done' | 'error' | 'canceled';
    progress: number;
    speed: number;
    errorMessage?: string;
    uploaderName: string;
    deviceId: string;
};

export const UploadPlaceholder = Node.create<UploadPlaceholderOptions>({
    name: 'uploadPlaceholder',

    group: 'block',
    atom: true,

    addAttributes() {
        return {
            id: { default: null },
            fileName: { default: '' },
            fileType: { default: '' },
            fileSize: { default: 0 },
            status: { default: 'uploading' },
            progress: { default: 0 },
            speed: { default: 0 },
            errorMessage: { default: null },
            uploaderName: { default: '' },
            deviceId: { default: '' },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-upload-placeholder]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(HTMLAttributes, { 'data-upload-placeholder': 'true' }),
            'Uploading file…',
        ];
    },

    addCommands() {
        return {
            insertUploadPlaceholder:
                (attrs) =>
                    ({ chain }) => {
                        return chain()
                            .focus()
                            .insertContent([
                                {
                                    type: this.name,
                                    attrs,
                                },
                                {
                                    type: 'paragraph',
                                },
                            ])
                            .run();

                    },

            updateUploadPlaceholder:
                (id, newAttrs) =>
                    ({ tr, state }) => {
                        const pos = findNodeById(state, id, this.name);
                        if (pos === null) return false;

                        const oldNode = state.doc.nodeAt(pos);
                        if (!oldNode || oldNode.type.name !== this.name) return false;

                        tr.setNodeMarkup(pos, undefined, {
                            ...oldNode.attrs,
                            ...newAttrs,
                        });

                        return true;
                    },

            removeUploadPlaceholder:
                (id) =>
                    ({ tr, state }) => {
                        const pos = findNodeById(state, id, this.name);
                        if (pos === null) return false;

                        tr.delete(pos, pos + 1);
                        return true;
                    },
        };
    },
    addNodeView() {
        return ReactNodeViewRenderer(UploadPlaceholderNode);
    },


});


