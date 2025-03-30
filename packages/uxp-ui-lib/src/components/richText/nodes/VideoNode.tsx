// VideoComponent.tsx


import { useMediaQuery, useTheme } from "@mui/material";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { buildPath } from "@uxp/common";
import React, { useEffect, useMemo, useRef, useState } from "react";
import "react-resizable/css/styles.css";
import { useRichEditorUI } from "../RichEditorContext";
import { FloatingVideoToolbar } from "./components/FloatingVideoToolbar";
import { ResizableMediaBox } from "./components/ResizableMediaBox.tsx";
import { AlignmentStyles } from "./utils/videoHelpers";

const VideoNode: React.FC<NodeViewProps> = ({ node, updateAttributes, selected, extension: { options: { basePath } } }) => {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
    const containerRef = useRef<HTMLDivElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const { editable, portalContainerRef } = useRichEditorUI()

    const { src, controls, autoplay, loop, width, height, align = 'center', aspectLocked, aspectRatio } = node.attrs

    const fullSrc = useMemo(() => buildPath(basePath ?? '', src), [basePath, src])

    const [toolbarLeft, setToolbarLeft] = useState<number | null>(null)
    const slotProps = { popper: { container: portalContainerRef.current } }

    useEffect(() => {
        const video = videoRef.current
        if (video && (!width || !height)) {
            const onLoaded = () => {
                const naturalWidth = video.videoWidth
                const naturalHeight = video.videoHeight
                updateAttributes({
                    width: width || naturalWidth,
                    height: height || naturalHeight,
                    aspectRatio: naturalWidth / naturalHeight,
                })
            }
            video.addEventListener('loadedmetadata', onLoaded)
            return () => video.removeEventListener('loadedmetadata', onLoaded)
        }
        return;;
    }, [width, height, updateAttributes])

    useEffect(() => {
        if (!videoRef.current || !containerRef.current) return
        const videoBox = videoRef.current.getBoundingClientRect()
        const containerBox = containerRef.current.getBoundingClientRect()
        const relativeLeft = videoBox.left - containerBox.left + videoBox.width / 2
        setToolbarLeft(Math.max(relativeLeft, 100))
    }, [width, height, align, selected])

    return (
        <NodeViewWrapper
            contentEditable={false}
            className="uxp-video-node"
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
                    <video
                        ref={videoRef}
                        src={fullSrc}
                        controls={controls}
                        autoPlay={autoplay}
                        loop={loop}
                        draggable={false}
                        width="100%"
                        height="100%"
                        style={{
                            display: 'block',
                            backgroundColor: '#000',
                            pointerEvents: editable ? 'none' : 'auto'
                        }}
                    />
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
    );
};


export default VideoNode;
