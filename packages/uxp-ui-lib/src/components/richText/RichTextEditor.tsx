import "prosemirror-view/style/prosemirror.css";
import { RichEditorProvider, RichTextEditorProps } from "./RichEditorContext";
import { RichTextEditorContent } from "./RichTextEditorContent";


export function RichTextEditor(props: RichTextEditorProps) {
    return (
        <RichEditorProvider {...props}>
            <RichTextEditorContent />
        </RichEditorProvider>
    );
}

export default RichTextEditor;
