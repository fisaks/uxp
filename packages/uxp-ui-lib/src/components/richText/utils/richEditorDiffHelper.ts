import { JSONContent } from '@tiptap/core';
import { diffChars } from 'diff';


export type DiffType = 'unchanged' | 'added' | 'removed' | 'modified';

export type DiffWord = {
    text: string | null;
    marks?: JSONContent['marks'];
    other?: JSONContent
};

export function createDiffWrapper(type: DiffType, content: JSONContent[]): JSONContent {
    return {
        type: 'diffWrapper',
        attrs: { type },
        content,
    };
}

export function createDiffMark(type: DiffType, text: string, baseMarks?: JSONContent['marks']): JSONContent {
    return {
        type: 'text',
        text,
        marks: [
            ...(baseMarks?.filter(m => m.type !== 'diff') ?? []),
            { type: 'diff', attrs: { type } }
        ],
    };
}

function marksEqual(m1?: JSONContent['marks'], m2?: JSONContent['marks']): boolean {
    if (!m1 && !m2) return true;
    if (!m1 || !m2) return false;
    if (m1.length !== m2.length) return false;
    const sorted1 = [...m1].sort((a, b) => a.type.localeCompare(b.type));
    const sorted2 = [...m2].sort((a, b) => a.type.localeCompare(b.type));
    return sorted1.every((mark, idx) =>
        mark.type === sorted2[idx].type &&
        normalizeAttrs(mark.attrs) === normalizeAttrs(sorted2[idx].attrs)
    );
}


function normalizeAttrs(attrs: any = {}): string {
    const entries = Object.entries(attrs).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(Object.fromEntries(entries));
}


function diffTextContentArrays(
    aWords: DiffWord[],
    bWords: DiffWord[],
    wordDiff?: boolean
): { a: JSONContent[]; b: JSONContent[] } {

    const resultA: JSONContent[] = [];
    const resultB: JSONContent[] = [];
    const maxLen = Math.max(aWords.length, bWords.length);

    for (let i = 0; i < maxLen; i++) {
        const wordA = aWords?.[i];
        const wordB = bWords?.[i];

        if (wordA === undefined && wordB !== undefined) {
            if (wordB.text) {
                resultB.push(createDiffMark('added', wordB.text, wordB.marks));
            } else if (wordB.other) {
                resultB.push(createDiffWrapper('added', [wordB.other]));
            }
            continue;
        }

        if (wordB === undefined && wordA !== undefined) {
            if (wordA.text) {
                resultA.push(createDiffMark('removed', wordA.text, wordA.marks));
            } else if (wordA.other) {
                resultA.push(createDiffWrapper('removed', [wordA.other]));
            }
            continue;
        }
        if (wordA?.other && wordB?.other) {
            const diff = deepDiff(wordA.other, wordB.other, wordDiff);
            if (diff.a) resultA.push(diff.a);
            if (diff.b) resultB.push(diff.b);
            continue;
        }
        if (wordA?.other && !wordB?.other) {
            resultA.push(createDiffWrapper('removed', [wordA.other]));
            if (wordB.text) resultB.push(createDiffMark('added', wordB.text, wordB.marks));
        }
        if (!wordA?.other && wordB?.other) {
            resultB.push(createDiffWrapper('added', [wordB.other]));
            if (wordA.text) resultA.push(createDiffMark('removed', wordA.text, wordA.marks));
        }
        if (!wordA.text && !wordB.text) {
            console.error("Both words are null or undefined", wordA, wordB);
            continue;
        }
        if (!wordA?.text && wordB?.text) {
            resultB.push(createDiffMark('added', wordB.text, wordB.marks));
            continue;
        }
        if (wordA?.text && !wordB?.text) {
            resultA.push(createDiffMark('removed', wordA.text, wordA.marks));
            continue;
        }
        if (!wordDiff && wordA?.text !== wordB?.text) {
            diffChars(wordA.text!, wordB.text!).forEach((part) => {
                if (part.added) {
                    resultB.push(createDiffMark('added', part.value, wordB.marks));
                } else if (part.removed) {
                    resultA.push(createDiffMark('removed', part.value, wordA.marks));
                } else if (!marksEqual(wordA.marks, wordB.marks)) {
                    resultA.push(createDiffMark('modified', part.value, wordA.marks));
                    resultB.push(createDiffMark('modified', part.value, wordB.marks));
                } else {
                    resultA.push(createTextNode(part.value, wordA.marks));
                    resultB.push(createTextNode(part.value, wordB.marks));
                }
            })
            continue;
        }
        if (wordDiff && wordA?.text !== wordB?.text) {
            resultA.push(createDiffMark('removed', wordA.text!, wordA.marks));
            resultB.push(createDiffMark('added', wordB.text!, wordB.marks));
            continue;
        }

        if (!marksEqual(wordA.marks, wordB.marks)) {
            resultA.push(createDiffMark('modified', wordA.text!, wordA.marks));
            resultB.push(createDiffMark('modified', wordB.text!, wordB.marks));
            continue
        }
        resultA.push(createTextNode(wordA.text!, wordA.marks));
        resultB.push(createTextNode(wordB.text!, wordB.marks));
    }

    return {
        a: mergeTextNodes(resultA),
        b: mergeTextNodes(resultB),
    };
}

function createTextNode(
    text: string,
    marks?: JSONContent['marks'],
    diff?: 'added' | 'removed'
): JSONContent {
    const baseMarks = marks?.filter(m => m.type !== 'diff') ?? [];
    return {
        type: 'text',
        text,
        marks: diff
            ? [...baseMarks, { type: 'diff', attrs: { type: diff } }]
            : baseMarks.length === 0 ? undefined : baseMarks,
    };
}

function mergeTextNodes(nodes: JSONContent[]): JSONContent[] {
    const merged: JSONContent[] = [];
    for (const node of nodes) {
        const last = merged.length > 0 ? merged[merged.length - 1] : undefined;
        if (
            last &&
            last.type === 'text' &&
            node.type === 'text' &&
            marksEqual(last.marks, node.marks)

        ) {
            last.text = (last.text ?? "") + (node.text ?? "");
        } else {
            merged.push({ ...node });
        }
    }
    return merged;
}

export function extractWordsFromContent(content: JSONContent[]): DiffWord[] {
    const words: DiffWord[] = [];
    for (const node of content) {
        if (node.type === 'text' && typeof node.text === 'string') {
            const parts = node.text.split(/(\s+)/).filter(Boolean);
            for (const part of parts) {
                words.push({ text: part, marks: node.marks });
            }
        } else {
            words.push({ text: null, other: node });

        }
    }
    return words;
}

const containsText = (node: JSONContent | undefined) =>
    Array.isArray(node?.content) && node.content.some(n => n.type === 'text');


function deepDiff(a?: JSONContent, b?: JSONContent, wordDiff?: boolean): { a?: JSONContent, b?: JSONContent } {
    if (!a && b) {
        if (b.type === 'text' && b.text) {
            return { b: createDiffMark('added', b.text, b.marks) };
        }
        return { b: createDiffWrapper('added', [b]) };
    }
    if (a && !b) {
        if (a.type === 'text' && a.text) {
            return { a: createDiffMark('removed', a.text, a.marks) };
        }
        return { a: createDiffWrapper('removed', [a]) };
    }
    if (!a || !b) {
        return {};
    }

    if (a.type !== b.type) {
        return {
            a: createDiffWrapper('removed', [a]),
            b: createDiffWrapper('added', [b]),
        };
    }

    if (a.type === b.type &&
        (normalizeAttrs(a.attrs) !== normalizeAttrs(b.attrs) ||
            !marksEqual(a.marks, b.marks))
    ) {
        return {
            a: createDiffWrapper('modified', [a]),
            b: createDiffWrapper('modified', [b]),
        };
    }

    if (
        containsText(a) &&
        containsText(b) &&
        a.type === b.type
    ) {
        const wordsA = extractWordsFromContent(a.content!);
        const wordsB = extractWordsFromContent(b.content!);
        const { a: contentA, b: contentB } = diffTextContentArrays(wordsA, wordsB, wordDiff);

        return {
            a: { ...a, content: contentA },
            b: { ...b, content: contentB },
        };
    }
    if (Array.isArray(a.content) || Array.isArray(b.content)) {
        const resultA: JSONContent[] = [];
        const resultB: JSONContent[] = [];
        const maxLen = Math.max(a.content?.length || 0, b.content?.length || 0);

        for (let i = 0; i < maxLen; i++) {
            const childA = a.content?.[i];
            const childB = b.content?.[i];

            const diff = deepDiff(childA, childB, wordDiff);
            if (diff.a) resultA.push(diff.a);
            if (diff.b) resultB.push(diff.b);

        }

        return {
            a: { ...a, content: resultA },
            b: { ...b, content: resultB },
        };
    }

    return {
        a,
        b,
    };
}

export function generateRichTextDiffFromJson(
    jsonA: JSONContent,
    jsonB: JSONContent,
    wordDiff?: boolean
): { a: JSONContent; b: JSONContent } {
    return deepDiff(jsonA, jsonB, wordDiff) as { a: JSONContent, b: JSONContent };
}

