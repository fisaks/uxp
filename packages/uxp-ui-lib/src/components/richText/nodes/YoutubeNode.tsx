import { useMediaQuery, useTheme } from '@mui/material'
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react'
import React, { useEffect, useRef, useState } from 'react'
import 'react-resizable/css/styles.css'
import { useRichEditorUI } from '../RichEditorContext'

import "react-resizable/css/styles.css"
import { FloatingVideoToolbar } from "./components/FloatingVideoToolbar"
import { ResizableMediaBox } from "./components/ResizableMediaBox.tsx"
import { AlignmentStyles } from "./utils/videoHelpers"


const YoutubeNode: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {

    const { videoId, width, height, start, align, aspectLocked, aspectRatio } = node.attrs
    const { editable, portalContainerRef } = useRichEditorUI()
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

    const imageRef = useRef<HTMLImageElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [toolbarLeft, setToolbarLeft] = useState<number | null>(null)
    const slotProps = { popper: { container: portalContainerRef.current } }




    useEffect(() => {
        if (!imageRef.current || !containerRef.current) return
        const imageBox = imageRef.current.getBoundingClientRect()
        const containerBox = containerRef.current.getBoundingClientRect()
        const relativeLeft = imageBox.left - containerBox.left + imageBox.width / 2
        setToolbarLeft(Math.max(relativeLeft, 100))
    }, [width, height, align, selected])

    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?start=${start}`
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

    return (
        <NodeViewWrapper
            className="youtube-wrapper"
            contentEditable={false}
            draggable={false}
            style={{ position: 'relative', ...AlignmentStyles[isMobile ? 'center' : align] }}
        >
            <div ref={containerRef} data-drag-handle={selected ? "true" : undefined}
                style={{
                    width: "100%",
                    maxWidth: "100%",
                    display: "inline-block"
                }}
            >
                <ResizableMediaBox
                    width={width}
                    height={height}
                    aspectLocked={aspectLocked}
                    aspectRatio={aspectRatio}
                    editable={!!editable}
                    selected={selected}
                    onResizeStop={({ width, height }) => updateAttributes({ width, height })}
                >
                    {editable ? (
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <img
                                ref={imageRef}
                                draggable={false}
                                src={thumbnailUrl}
                                alt="YouTube video thumbnail"
                                data-youtube-id={videoId}
                                onLoad={(e) => {
                                    const img = e.currentTarget
                                    const naturalWidth = img.naturalWidth
                                    const naturalHeight = img.naturalHeight
                                    const ratio = naturalWidth / naturalHeight
                                    ratio != aspectRatio && updateAttributes({ aspectRatio: naturalWidth / naturalHeight });
                                }}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    border: 0,
                                }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                    borderRadius: '50%',
                                    padding: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                        </div>
                    ) : (
                        <iframe width="100%" height="100%" src={embedUrl} title="YouTube video" allowFullScreen />
                    )}
                </ResizableMediaBox>

                {editable && selected && (
                    <FloatingVideoToolbar
                        align={align}
                        aspectLocked={aspectLocked}
                        onAlignChange={(value) => updateAttributes({ align: value })}
                        onAspectToggle={() => updateAttributes({ aspectLocked: !aspectLocked })}
                        toolbarLeft={toolbarLeft}
                        height={height}
                        slotProps={slotProps}
                    />
                )}
            </div>
        </NodeViewWrapper>
    )
}

export default YoutubeNode
