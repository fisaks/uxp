import { NodeViewProps, NodeViewWrapper } from '@tiptap/react'
import React, { useEffect, useRef, useState } from 'react'
import { ResizableBox } from 'react-resizable'
import 'react-resizable/css/styles.css'
import { useRichEditorUI } from '../RichEditorContext'

const YoutubeNode: React.FC<NodeViewProps> = ({ node, updateAttributes, editor, selected }) => {
    const { videoId, width, height, start } = node.attrs
    const { editable, } = useRichEditorUI();
    const [containerWidth, setContainerWidth] = React.useState<number>(800);
    const [maxConstraints, setMaxConstraints] = useState<[number, number]>([800, 450])
    const [aspectRatio, setAspectRatio] = useState<number>(width / height || (16 / 9))

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(([entry]) => {
            const width = entry.contentRect.width;
            const maxWidth = width
            const maxHeight = Math.round(maxWidth / aspectRatio)

            setMaxConstraints([maxWidth, maxHeight])
            setContainerWidth(width);
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const onResizeStop = (_: any, data: any) => {
        updateAttributes({
            width: data.size.width,
            height: data.size.height,
        })
    }

    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?start=${start}`
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

    return (
        <NodeViewWrapper className="youtube-wrapper" contentEditable={false} draggable={false}>
            <div
                data-drag-handle={selected ? "true" : undefined}
                ref={containerRef}
                style={{
                    width: "100%",
                    maxWidth: "100%",
                    display: "inline-block"
                }}>

                <ResizableBox
                    minConstraints={[100, 100]}
                    maxConstraints={maxConstraints}
                    width={Number(Math.min(width, containerWidth) || 320)}
                    height={Number(height || 180)}

                    onResizeStop={onResizeStop}
                    lockAspectRatio={true}
                    resizeHandles={editable && !selected ? ["se", "nw", "sw", "ne", "e", "n", "w", "s"] : []}
                >
                    {editable ? (
                        <img
                            draggable={false}
                            src={thumbnailUrl}
                            alt="YouTube video thumbnail"
                            data-youtube-id={videoId}
                            onLoad={(e) => {
                                const img = e.currentTarget
                                const naturalWidth = img.naturalWidth
                                const naturalHeight = img.naturalHeight
                                console.log("naturalWidth", naturalWidth, "naturalHeight", naturalHeight,naturalWidth / naturalHeight)
                                setAspectRatio(naturalWidth / naturalHeight)

                            }}
                            style={{
                                width: '100%',
                                maxWidth: "100%",
                                height: '100%',
                                objectFit: 'cover',
                                border: 0,
                            }}
                        />
                    ) : (
                        <iframe
                            width="100%"
                            height="100%"
                            src={embedUrl}
                            title="YouTube video"
                            allowFullScreen
                        />
                    )}
                </ResizableBox>
            </div>
        </NodeViewWrapper>
    )
}

export default YoutubeNode
