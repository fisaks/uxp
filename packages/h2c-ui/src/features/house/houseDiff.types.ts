export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

export type TextDiff = {
  type: DiffType;
  oldValue?: string;
  newValue?: string;
  charDiffs?: CharacterDiff[];
};

export type CharacterDiff = {
  type: DiffType;
  value: string;
};

export type FieldDiffMap = Record<string, TextDiff>;

export type DetailDiffEntry = {
  key: string;
  type: DiffType;
  valueDiff?: TextDiff;
};

export type DetailsDiff = DetailDiffEntry[];

export type BuildingDiff = {
  uuid: string;
  type: DiffType; // e.g., 'added', 'removed', 'modified'
  fieldDiffs: FieldDiffMap;
  detailsDiff: DetailsDiff;
};

export type HouseDataDiff = {
  fieldDiffs: FieldDiffMap;
  detailsDiff: DetailsDiff;
  buildingDiffs: BuildingDiff[];
};
