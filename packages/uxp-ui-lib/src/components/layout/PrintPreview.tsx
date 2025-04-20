import { Box, Typography } from "@mui/material"

import { safeNormalizeFilename } from "@uxp/common"
import html2pdf from "html2pdf.js"
import { DateTime } from "luxon"
import { MouseEvent, useEffect, useRef, useState } from "react"
import { useApplicationHeadRoot } from "../../features/shadow-root/ShadowRootContext"
import "./PrintPreview.css"
import { PrintPreviewToolbar, PrintSettings } from "./PrintPreviewToolbar"

type PrintPreviewProps = {
    title?: string
    children?: React.ReactNode
    defaultSetting?: PrintSettings
    meta?: {
        docId?: string
        version?: string
        createdAt?: string
    }
    onPrinterSettingChange?: (settings: PrintSettings) => void
}
export const PrintPreview = ({ title, children, defaultSetting, meta, onPrinterSettingChange }: PrintPreviewProps) => {
    console.log("PrintPreview", title);
    const headRoot = useApplicationHeadRoot();
    const pdfWrapperRef = useRef<HTMLDivElement | null>(null);
    const [printSettings, setPrintSettings] = useState<PrintSettings>({
        orientation: defaultSetting?.orientation ?? 'portrait',
        includeHeader: defaultSetting?.includeHeader ?? (!!meta || !!title),
        showName: defaultSetting?.showName ?? !!title,
        showMeta: defaultSetting?.showMeta ?? !!meta,
    });
    const [documentName, setDocumentName] = useState<string>(title ?? "");
    useEffect(() => {
        setDocumentName(title ?? "");
    }, [title])
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

    const handleExportPDF = () => {
        const element = pdfWrapperRef.current
        if (!element) return;
        console.log('Exporting PDF', element.classList.toString());
        element.classList.add("uxp-pdf-export");
        html2pdf().from(element).set({

            filename: `${safeNormalizeFilename(documentName)}.pdf`,
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
                element.classList.remove("uxp-pdf-export");
            });
    };

    const handlePrint = (e: MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        e.preventDefault();
        window.print();
    };
    const handlePrintSettings = (settings: PrintSettings) => {
        setPrintSettings(settings);
        onPrinterSettingChange?.(settings);
    }
    const resetDocumentName = () => {
        setDocumentName(title ?? "");
    }
    return <Box >
        <PrintPreviewToolbar documentName={documentName}
            handleExportPDF={handleExportPDF}
            handlePrint={handlePrint}
            printSettings={printSettings}
            setDocumentName={setDocumentName}
            setPrintSettings={handlePrintSettings}
            resetDocumentName={resetDocumentName}
        />
        <Box className={`uxp-print-paper ${printSettings.orientation === 'landscape' ? 'landscape' : ''}`}>
            <Box ref={pdfWrapperRef} className="uxp-pdf-wrapper">
                {printSettings.includeHeader && <Box
                    className="uxp-print-header"

                >

                    {printSettings.showMeta && <Typography sx={{ flex: 1, fontSize: '0.5rem', color: 'black', }}>
                        {meta?.docId && (<>Document Id:{meta?.docId} <br /></>)}
                        {meta?.version && (<>Version: {meta?.version}</>)}
                    </Typography>}

                    {printSettings.showName && <Typography sx={{ flex: 2, textAlign: 'center', fontWeight: 'bold', fontSize: '1rem', color: 'black', }}>
                        {documentName}
                    </Typography>}

                    {printSettings.showMeta && <Typography sx={{ flex: 1, textAlign: 'right', fontSize: '0.5rem', color: 'black', }}>
                        {meta?.createdAt && (<>Created: {DateTime.fromISO(meta.createdAt).toFormat('d.M.yyyy HH:mm')} <br /></>)}
                        Printed: {DateTime.now().toFormat('d.M.yyyy HH:mm')}
                    </Typography>}
                </Box>}
                <Box className="uxp-print-document">
                    {children}
                </Box>
            </Box>
        </Box>
    </Box>
}