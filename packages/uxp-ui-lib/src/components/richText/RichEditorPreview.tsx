import {
    Box
} from '@mui/material';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import * as Y from 'yjs';

import { getRichEditorExtensions } from './components/useRichEditor';
import { RichEditorProvider } from './RichEditorContext';
import * as styles from "./RichTextEditor.module.css";

export type RichEditorPreviewProps = {
    docId: string;
    version: number;
    createdAt?: string;
    content: Uint8Array
    title?: string;
    imageBasePath: string
};

export const RichEditorPreview = ({ content, imageBasePath, docId, title, version, createdAt }: RichEditorPreviewProps) => {

    const [yDoc, setYDoc] = useState<Y.Doc | undefined>(undefined);

    const editor = useEditor({
        editable: false,
        extensions: getRichEditorExtensions({
            yDoc: yDoc,
            basePath: imageBasePath,
            forPreview: true,
        }),
    }, [yDoc]);

    useEffect(() => {
        const newYDoc = new Y.Doc();
        Y.applyUpdate(newYDoc, content);
        setYDoc(newYDoc);
    }, [content]);

    if (!yDoc) {
        return null;;
    }

    return (
        <RichEditorProvider imageBasePath={imageBasePath} editable={false} yDoc={yDoc} docInstanceId={version} >
            <Box className={styles.editorContainer} >
                <EditorContent editor={editor} className={styles.editorWrapper} />
            </Box>
        </RichEditorProvider>

    );
}