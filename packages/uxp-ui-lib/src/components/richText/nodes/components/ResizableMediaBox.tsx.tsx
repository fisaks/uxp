import React, { useEffect, useRef, useState } from 'react'
import { ResizableBox } from 'react-resizable'
import 'react-resizable/css/styles.css'

interface ResizableMediaBoxProps {
  width: number
  height: number
  aspectLocked: boolean
  aspectRatio: number
  editable: boolean
  selected: boolean
  onResizeStop: (size: { width: number; height: number }) => void
  children: React.ReactNode
}

export const ResizableMediaBox: React.FC<ResizableMediaBoxProps> = ({ width, height, aspectRatio, aspectLocked, onResizeStop, children, editable, selected }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)
  const [maxConstraints, setMaxConstraints] = useState<[number, number]>([800, 450])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      const maxWidth = entry.contentRect.width
      setContainerWidth(maxWidth)
      if (aspectLocked) {
        setMaxConstraints([maxWidth, Math.round(maxWidth / aspectRatio)])
      } else {
        setMaxConstraints([maxWidth, Infinity])
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [width, height, aspectLocked])

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: '100%', display: 'inline-block' }}>
      <ResizableBox
        minConstraints={[100, 100]}
        maxConstraints={maxConstraints}
        width={Math.min(width, containerWidth)}
        height={height}
        lockAspectRatio={aspectLocked}
        onResizeStop={(_, data) => onResizeStop(data.size)}
        resizeHandles={editable && !selected ? ["se", "nw", "sw", "ne", "e", "n", "w", "s"] : []}
      >
        {children}
      </ResizableBox>
    </div>
  )
} 
