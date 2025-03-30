import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'

import { Plugin, PluginKey } from 'prosemirror-state'
import YoutubeNode from '../nodes/YoutubeNode'

const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/

export const Youtube = Node.create({
    name: 'youtube',
    group: 'block',
    atom: true,
    draggable: true,
    selectable: true,


    addAttributes() {
        return {
            videoId: { default: null },
            width: { default: 640 },
            height: { default: 480 },
            start: { default: 0 },
            align: { default: 'center' },
            aspectLocked: { default: true },
            aspectRatio: { default: 16 / 9 },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'iframe[src*="youtube"]',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['iframe', {
            ...HTMLAttributes,
            src: `https://www.youtube-nocookie.com/embed/${HTMLAttributes.videoId}?start=${HTMLAttributes.start}`,
            width: HTMLAttributes.width,
            height: HTMLAttributes.height,
            allowfullscreen: 'true',
        }]
    },

    addNodeView() {
        return ReactNodeViewRenderer(YoutubeNode)
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('youtube-paste-handler'),
                props: {
                    handlePaste: (view, event) => {
                        const text = event.clipboardData?.getData('text/plain')
                        if (!text) return false

                        const match = text.match(YOUTUBE_REGEX)
                        if (!match) return false

                        const videoId = match[1]
                        const { state } = view
                        const { from, to } = state.selection
                        const videoNode = this.type.create({
                            videoId,
                            width: 640,
                            height: 480,
                            start: 0,
                        })

                        const tr = state.tr.replaceRangeWith(from, to, videoNode)
                        view.dispatch(tr)
                        return true
                    },
                },
            }),
        ]
    },
})
