import { useMemo } from "react";

type FieldRenderItem = {
    key: string;
    val: string;
    size: number;
};

export const getFieldSizeFromValue = (key: string, value: string): number => {
    const valueLen = value?.length ?? 0;
    const keyLen = key?.length ?? 0;
    const len = Math.max(valueLen, keyLen);

    if (len > 60) return 12;
    if (len > 25) return 8;

    return 4;
};

export const useFieldKeysRenderValue = (value: Record<string, string>) => {

    const renderValue: FieldRenderItem[] = useMemo(() => {
        const fields: FieldRenderItem[] = [];
        const entries = Object.entries(value).sort(([a], [b]) =>
            a.toLowerCase().localeCompare(b.toLowerCase())
        );

        let currentRow: FieldRenderItem[] = [];
        let currentRowWidth = 0;

        const flushRow = () => {
            const remaining = 12 - currentRowWidth;
            const baseBonus = Math.floor(remaining / currentRow.length);
            let extra = remaining % currentRow.length;

            currentRow.forEach((item, i) => {
                item.size += baseBonus;
                if (i === currentRow.length - 1) {
                    item.size += extra; // all remaining extra goes to the last item
                }
                fields.push(item);
            });

            currentRow = [];
            currentRowWidth = 0;
        };

        for (const [key, val] of entries) {
            const baseSize = getFieldSizeFromValue(key, val); // 3, 6, or 12

            if (currentRowWidth + baseSize > 12) {
                flushRow();
            }

            currentRow.push({ key, val, size: baseSize });
            currentRowWidth += baseSize;
        }

        if (currentRow.length > 0) {
            flushRow();
        }

        return fields;
    }, [value]);

    return renderValue;
}

