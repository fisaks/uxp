import { HouseData } from '@h2c/common';
import { diffChars } from 'diff';
import { BuildingDiff, CharacterDiff, DetailsDiff, FieldDiffMap, HouseDataDiff, TextDiff } from './houseDiff.types';

function getCharDiff(oldText = '', newText = ''): CharacterDiff[] {
    return diffChars(oldText, newText).map(part => ({
        type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
        value: part.value,
    }));
}

function getFieldDiff(oldValue?: string, newValue?: string): TextDiff {
    if (!oldValue && newValue) return { type: 'added', newValue };
    if (oldValue && !newValue) return { type: 'removed', oldValue };
    if (oldValue !== newValue) {
        return {
            type: 'modified',
            oldValue,
            newValue,
            charDiffs: getCharDiff(oldValue, newValue),
        };
    }
    return { type: 'unchanged', oldValue, newValue };
}

function diffDetails(
    oldDetails: Record<string, string> = {},
    newDetails: Record<string, string> = {}
): DetailsDiff {
    const allKeys = new Set([...Object.keys(oldDetails), ...Object.keys(newDetails)]);
    const diffs: DetailsDiff = [];

    for (const key of allKeys) {
        const oldVal = oldDetails[key];
        const newVal = newDetails[key];

        if (oldVal === undefined && newVal !== undefined) {
            diffs.push({ key, type: 'added', valueDiff: { type: 'added', newValue: newVal } });
        } else if (oldVal !== undefined && newVal === undefined) {
            diffs.push({ key, type: 'removed', valueDiff: { type: 'removed', oldValue: oldVal } });
        } else if (oldVal !== newVal) {
            diffs.push({
                key,
                type: 'modified',
                valueDiff: {
                    type: 'modified',
                    oldValue: oldVal,
                    newValue: newVal,
                    charDiffs: getCharDiff(oldVal, newVal),
                },
            });
        }
    }

    return diffs;
}

export function diffHouseData(oldData: HouseData, newData: HouseData): HouseDataDiff {
    const fieldsToCompare = ['name', 'address', 'yearBuilt', 'legalRegistrationNumber'] as const;

    const fieldDiffs: FieldDiffMap = {};
    for (const key of fieldsToCompare) {
        fieldDiffs[key] = getFieldDiff(oldData[key], newData[key]);
    }
    const houseDetailsDiff = diffDetails(oldData.details, newData.details);


    const buildingDiffs: BuildingDiff[] = [];
    const oldMap = Object.fromEntries(oldData.buildings.map(b => [b.uuid, b]));
    const newMap = Object.fromEntries(newData.buildings.map(b => [b.uuid, b]));

    const allUuids = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);

    for (const uuid of allUuids) {
        const oldB = oldMap[uuid];
        const newB = newMap[uuid];

        if (!oldB && newB) {
            buildingDiffs.push({ uuid, type: 'added', fieldDiffs: {}, detailsDiff: diffDetails({}, newB.details), });
        } else if (oldB && !newB) {
            buildingDiffs.push({ uuid, type: 'removed', fieldDiffs: {}, detailsDiff: diffDetails(oldB.details, {}), });
        } else if (oldB && newB) {
            const buildingFieldDiffs: FieldDiffMap = {};
            const buildingFields = ['name', 'yearBuilt'] as const;
            for (const field of buildingFields) {
                buildingFieldDiffs[field] = getFieldDiff(oldB[field], newB[field]);
            }
            const detailsDiff = diffDetails(oldB.details, newB.details);
            const changed = Object.values(buildingFieldDiffs).some(d => d.type !== 'unchanged');
            if (changed) {
                buildingDiffs.push({ uuid, type: 'modified', fieldDiffs: buildingFieldDiffs, detailsDiff });
            }
        }
    }

    return { fieldDiffs, detailsDiff: houseDetailsDiff, buildingDiffs };
}
