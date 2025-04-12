import {
    Box,
    Typography
} from '@mui/material';
import { EditorContent, useEditor } from '@tiptap/react';
import { safeNormalizeFilename } from '@uxp/common';
import html2pdf from 'html2pdf.js';
import { DateTime } from 'luxon';
import { MouseEvent, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { useApplicationHeadRoot } from '../../features/shadow-root/ShadowRootContext';
import { PrintPreviewToolbar, PrintSettings } from './components/PrintPreviewToolbar';
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
    const pdfWrapperRef = useRef<HTMLDivElement | null>(null);
    const [documentName, setDocumentName] = useState<string>(title ?? "");
    const headRoot = useApplicationHeadRoot();
    const [printSettings, setPrintSettings] = useState<PrintSettings>({
        orientation: 'portrait',
        includeHeader: true,
        showName: true,
        showMeta: true,
    });

    const editor = useEditor({
        editable: false,
        extensions: getRichEditorExtensions({
            yDoc: yDoc,
            basePath: imageBasePath,
            forPreview: true,
        }),
    }, [yDoc]);

    useEffect(() => {
        const style = document.createElement('style');
        style.id = 'print-orientation';
        style.textContent = `
          @media print {
            @page {
              size: A4 ${printSettings.orientation};
              margin: 20mm;
            }
          }
        `;
        headRoot.appendChild(style);
        return () => {
            headRoot.removeChild(style);
        }
    }, [printSettings.orientation])
    useEffect(() => {
        const newYDoc = new Y.Doc();
        Y.applyUpdate(newYDoc, content);
        setYDoc(newYDoc);
    }, [content]);

    const handleExportPDF = () => {
        const element = pdfWrapperRef.current
        if (!element) return;
        console.log('Exporting PDF', element.classList.toString());
        element.classList.add(styles.pdfExport);
        html2pdf().from(element).set({

            filename: `${safeNormalizeFilename(documentName)}-${docId}-${version}.pdf`,
            margin: [20, 20, 20, 20],

            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, scrollY: 0, },
            jsPDF: { unit: 'mm', format: 'a4', orientation: printSettings.orientation },
            pagebreak: {
                mode: ['avoid-all', 'css', 'legacy'],
                before: ['.page-break'],
                after: [],
                avoid: ['p', 'h1', 'h2', 'h3', 'blockquote', 'img'],
            },
        }).save()
            .finally(() => {
                element.classList.remove(styles.pdfExport);
            });
    };

    const handlePrint = (e: MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        e.preventDefault();
        window.print();
    };

    return (
        <Box id="wrapper">
            <PrintPreviewToolbar documentName={documentName}
                setDocumentName={setDocumentName}
                handleExportPDF={handleExportPDF}
                handlePrint={handlePrint}
                printSettings={printSettings}
                setPrintSettings={setPrintSettings}
            />
            <Box id="document-content" className={`${styles.paper} ${printSettings.orientation === 'landscape' ? 'landscape' : ''}`}                >
                {yDoc && <RichEditorProvider imageBasePath={imageBasePath} editable={false} yDoc={yDoc} docInstanceId={version} >

                    <Box ref={pdfWrapperRef} className={`${styles.editorContainer} ${styles.pdfWrapper} print-preview`}>
                        {printSettings.includeHeader && <Box
                            className="first-page-header"
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid #ccc',
                                padding: '12px 0',
                                fontSize: '0.9rem',
                                fontFamily: '"Times New Roman", Times, serif',

                            }}
                        >

                            {printSettings.showMeta && <Typography sx={{ flex: 1, fontSize: '0.5rem', color: 'black', }}>
                                Document Id:{docId} <br />
                                Version: {version}
                            </Typography>}

                            {printSettings.showName && <Typography sx={{ flex: 2, textAlign: 'center', fontWeight: 'bold', fontSize: '1rem', color: 'black', }}>
                                {documentName}
                            </Typography>}

                            {printSettings.showMeta && <Typography sx={{ flex: 1, textAlign: 'right', fontSize: '0.5rem', color: 'black', }}>
                                {createdAt && `Created: ${DateTime.fromISO(createdAt).toFormat('d.M.yyyy HH:mm')}`} <br />
                                Printed: {DateTime.now().toFormat('d.M.yyyy HH:mm')}
                            </Typography>}
                        </Box>}

                        <EditorContent editor={editor} className={styles.editorWrapper} />

                    </Box>

                </RichEditorProvider>}
            </Box>
        </Box >

    );
}