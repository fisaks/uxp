// VideoComponent.tsx
import FormatAlignJustify from "@mui/icons-material/FormatAlignJustify";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";

import { IconButton, Paper, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { buildPath } from "@uxp/common";
import React, { useEffect, useMemo, useRef } from "react";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import { useRichEditorUI } from "../RichEditorContext";
import * as styles from "../RichTextEditor.module.css";
export type VideoNodeProps = NodeViewProps & {
    basePath?: string;
};
export const AlignmentStyles: Record<string, React.CSSProperties> = {
    left: { float: "left", margin: "0 1em 1em 0" },
    right: { float: "right", margin: "0 0 1em 1em" },
    center: { display: "block", margin: "1em auto" },
};

const VideoNode: React.FC<VideoNodeProps> = ({ node, updateAttributes, basePath, selected }) => {
    const theme = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = React.useState<number>(800);
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
    const { editable, portalContainerRef } = useRichEditorUI();
    const [aspectLocked, setAspectLocked] = React.useState(true);

    const [dragging, setDragging] = React.useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);

    const { src, controls, autoplay, loop, width, height, align = "center" } = node.attrs;
    const slotProps = { popper: { container: portalContainerRef.current } };
    const fullSrc = useMemo(() => buildPath(basePath ?? "", src), [basePath, src]);


    const activeAlign = {
        border: `2px solid ${theme.palette.primary.main}`,
        borderRadius: 2,
    }
    useEffect(() => {
        const video = videoRef.current;
        if (video && (!width || !height)) {
            const onLoaded = () => {
                const naturalWidth = video.videoWidth;
                const naturalHeight = video.videoHeight;

                updateAttributes({
                    width: width || naturalWidth,
                    height: height || naturalHeight,
                });

            };

            video.addEventListener("loadedmetadata", onLoaded);
            return () => video.removeEventListener("loadedmetadata", onLoaded);
        }
        return undefined
    }, [width, height, updateAttributes]);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(([entry]) => {
            const width = entry.contentRect.width;
            setContainerWidth(width);
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);


    const handleResizeStop = (_event: any, { size }: { size: { width: number; height: number } }) => {
        updateAttributes({ width: Math.min(size.width, containerWidth), height: size.height });
    };

    const setAlign = (value: "left" | "center" | "right") => {
        updateAttributes({ align: value });
    };
    const [toolbarLeft, setToolbarLeft] = React.useState<number | null>(null);

    useEffect(() => {
        if (!videoRef.current || !containerRef.current) return;

        const videoBox = videoRef.current.getBoundingClientRect();
        const containerBox = containerRef.current.getBoundingClientRect();

        // Calculate video left position relative to container
        const relativeLeft = videoBox.left - containerBox.left + videoBox.width / 2;
        setToolbarLeft(relativeLeft);
    }, [width, height, align, selected]); // run when these change

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer?.clearData();
        e.dataTransfer?.setDragImage(new Image(), 0, 0);
        
    };
    const handleDragStop = (e: React.DragEvent) => {
        setDragging(false)
    }

    return (
        <NodeViewWrapper contentEditable={false} className="uxp-video-node" draggable={selected && editable}
            onDragStart={handleDragStart}
            onDragEnd={handleDragStop}

            style={{ position: "relative", ...AlignmentStyles[isMobile ? "center" : align], }}>

            <div
                data-drag-handle
                ref={containerRef}
                onDragStart={() => setDragging(true)}
                onDragEnd={handleDragStop}
    
                style={{

                    width: "100%",
                    maxWidth: "100%",
                    display: "inline-block"
                }}>

                <ResizableBox
                    minConstraints={[100, 100]}
                    maxConstraints={[containerWidth, Infinity]}
                    width={Number(Math.min(width, containerWidth) || 320)}
                    height={Number(height || 180)}
                    onResizeStop={handleResizeStop}
                    resizeHandles={editable ? ["se", "nw", "sw", "ne", "e", "n", "w", "s"] : []}
                    lockAspectRatio={aspectLocked}

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
                        style={{ display: "block", backgroundColor: "#000", pointerEvents: editable ? "none" : "auto" }}
                    />

                </ResizableBox>
                {editable && selected && !dragging && (

                    <Paper
                        className={styles.floatingToolbar}
                        elevation={4} // Slight shadow for better visibility
                        sx={{
                            position: "absolute",
                            left: toolbarLeft ? `${toolbarLeft}px` : "50%",
                            transform: "translateX(-50%)",
                            top: `calc(${height}px + 8px)`, // Float just below the video
                            padding: "4px 8px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 1,
                            zIndex: 10,
                            backgroundColor: theme.palette.background.default, // Use theme background
                            color: theme.palette.text.primary, // Ensure good contrast

                        }}
                    >
                        <Tooltip title="Float Left" slotProps={slotProps}>
                            <IconButton onClick={() => setAlign("left")} sx={{ ...(align === "left" ? activeAlign : {}) }}>
                                <FormatAlignLeftIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Float Right" slotProps={slotProps}>
                            <IconButton onClick={() => setAlign("right")} sx={{ ...(align === "right" ? activeAlign : {}) }}>
                                <FormatAlignRightIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove Float" slotProps={slotProps} sx={{ ...(align === "center" ? activeAlign : {}) }}>

                            <IconButton onClick={() => setAlign("center")}>
                                <FormatAlignJustify />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={aspectLocked ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"} slotProps={slotProps}>
                            <IconButton
                                onClick={() => setAspectLocked((prev) => !prev)}
                                sx={aspectLocked ? activeAlign : {}}
                            >
                                {aspectLocked ? <LockIcon /> : <LockOpenIcon />}
                            </IconButton>
                        </Tooltip>

                    </Paper>
                )}

            </div>


        </NodeViewWrapper>
    );
};


export default VideoNode;
