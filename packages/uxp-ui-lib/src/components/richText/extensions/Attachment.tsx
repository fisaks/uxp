import { Node, mergeAttributes } from '@tiptap/core';
import { buildPath } from '@uxp/common';
import { removeBasePath } from './Video';



declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    AttachmentNode: {
      insertAttachment: (attrs: AttachmentAttributes) => ReturnType;

    };
  }
}


type AttachmentAttributes = {
  href: string;
  name?: string;

};
type AttachmentOptions = {
  basePath: string
}

export const Attachment = Node.create({
  name: 'attachment',
  group: 'inline',
  inline: true,
  selectable: true,
  draggable: true,
  atom: false,
  content: 'text*',
  marks: '',
  addOptions() {
    return {
      basePath: "",
    } as AttachmentOptions;
  },
  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element) => {
          let href = element.getAttribute("href") ?? "";
          return removeBasePath(this.options.basePath, href);
        }, renderHTML: attrs => ({ href: attrs.href }),

      },

    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-attachment]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-attachment': 'true',
        href: buildPath(this.options.basePath, HTMLAttributes.href),
        target: '_blank',
        rel: 'noopener noreferrer',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertAttachment:
        (attrs: { href: string; name?: string }) =>
          ({ chain }) => {
            const defaultName = attrs.name || decodeURIComponent(attrs.href.split('/').pop() || 'Download file');
            console.log("insertAttachment", attrs.href);
            chain().focus().insertContent([{
              type: this.name,
              attrs: {
                ...attrs,
              },
              content: [
                {
                  type: 'text',
                  text: defaultName,
                },
              ],
            },
            { type: 'text', text: ' ' },
            ]).setMeta('preventAutolink', true).run();
            return true;
          },
    };
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('a');
      const href = buildPath(this.options.basePath, node.attrs.href);
      dom.setAttribute('href', href);
      dom.setAttribute('target', '_blank');
      dom.setAttribute('rel', 'noopener noreferrer');
      dom.setAttribute('data-attachment', 'true');
      dom.className = 'tiptap-attachment';
      dom.contentEditable = 'false'; // prevents direct edits to the DOM node


      dom.addEventListener('click', (event) => {
        if (editor.isEditable) {
          event.preventDefault();
          event.stopPropagation();
        }
      });

      const contentDOM = document.createElement('span');
      contentDOM.contentEditable = 'true';
      contentDOM.draggable = true;
      dom.appendChild(contentDOM); // TipTap uses this span to manage inner content

      return {
        dom,
        contentDOM, 
      };
    };
  }

  

});


