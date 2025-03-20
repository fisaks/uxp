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

/*const RichTextEditorContent = () => {
    const portalContainerRef = useRef<HTMLDivElement | null>(null);
    const editorRootContainerRef = useRef<HTMLDivElement | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageToolbarPos, setImageToolbarPos] = useState<{ top: number; left: number } | null>(null);
    const [linkEl, setLinkEl] = useState<null | HTMLAnchorElement>(null);
    const triggerImageUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, [fileInputRef.current]);

    const slotProps = useMemo(() => ({ popper: { container: portalContainerRef.current } }), [portalContainerRef.current]);

    const editor = useRichEditor({}, [editable]);

    const applyLink = useCallback((href: string | undefined | null) => {

        if (editor?.getAttributes("image")) {
            editor?.commands.setImageLink(href as string | null);
        }
        else if (href && href.trim()) {
            editor?.chain().focus().extendMarkRange('link').setLink({ href }).run()

        }
        setLinkEl(null);
    }, [editor]);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const imageUrl = await onImageUpload(file);
            if (imageUrl) {
                editor?.chain().focus().setImage({ src: imageUrl }).run();
            }
        }
    };

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };
    const setImageLink = (el: HTMLElement, link: string | null) => {
        console.log("setImageLink", el, link);
        if (link === null) {
            editor?.commands.setImageLink(null);
        } else {
            setLinkEl(el as HTMLAnchorElement);
        }
    }

    if (!editor) return null;

    return (
        <Paper
            ref={editorRootContainerRef}
            elevation={3}
            sx={{ padding: 0 }}
            className={`${styles.editorContainer} ${isFullScreen ? styles.fullScreen : ""}`}
        >
            {
                label && <Typography variant="caption" color="text.secondary" sx={{ pl: "10px" }}>
                    {label}
                </Typography>
            }
            {editable && <RichEditorToolbar
                editor={editor}
                portalContainerRef={portalContainerRef}
                isFullScreen={isFullScreen}
                toggleFullScreen={toggleFullScreen}
                triggerImageUpload={triggerImageUpload}
                slotProps={slotProps}
            />}
            {editable && <FloatingImageToolbar
                editor={editor}
                imagePos={imageToolbarPos}
                slotProps={slotProps}
                onLink={setImageLink}
                onClick={() => setImageToolbarPos(null)}
            />}
            {editable && linkEl && <LinkEdit
                applyLink={applyLink}
                linkEl={linkEl}
                setLinkEl={setLinkEl}
                container={slotProps.popper.container as HTMLElement} />
            }

            <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleImageUpload} />

            <EditorContent editor={editor} className={styles.editorWrapper} />

            <div ref={portalContainerRef}></div>
        </Paper>
    );
};
*/
export default RichTextEditor;
