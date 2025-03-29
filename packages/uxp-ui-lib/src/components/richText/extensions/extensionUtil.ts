import { EditorState } from 'prosemirror-state';

export const findNodeById = (state: EditorState, id: string, type?: string): number | null => {
    let foundPos: number | null = null;

    state.doc.descendants((node, pos) => {
        if (node.attrs?.id === id && (!type || node.type.name === type)) {
            foundPos = pos;
            return false; // stop traversal
        }
        return true;
    });

    return foundPos;
}

export const findNodeByType = (state: EditorState, type: string): { id: string; pos: number }[] => {
    const result: { id: string; pos: number }[] = [];

    state.doc.descendants((node, pos) => {
        if (node.type.name === type) {
            result.push({ id: node.attrs.id, pos });
        }
        return true;
    });

    return result;
}

