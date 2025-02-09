import { DateTime } from "luxon";
type FilterOption<DataEntity> = {
    field: keyof DataEntity;
    value: string | number | boolean | null;
    operator: "eq" | "lt" | "gt" | "contains";
};
type SortOption<DataEntity> = {
    field: keyof DataEntity;
    direction: "asc" | "desc";
};
type PaginationOption = {
    page: number;
    size: number;
};
export type SearchRequest<DataEntity> = {
    filters?: FilterOption<DataEntity>[];
    search?: string | string[];
    sort?: SortOption<DataEntity>[];
    pagination: PaginationOption;
};
export type SearchResponse<SearchResult> = {
    data: SearchResult;
    pagination: {
        currentPage: number;
        pageSize: number;
        totalPages: number;
        totalItems: number;
    };
};
export type SearchFilterType<T> = {
    [K in keyof T]?: T[K] | null;
} & {
    [K in keyof T as `${string & K}Start` | `${string & K}End`]?: DateTime | null;
} & {
    search?: string | null;
};
export type SearchSortType<T> = {
    field: keyof T | null;
    direction: "asc" | "desc";
};
export type SearchFilterUIType = "text" | "datetime" | "selectOne" | "selectMultiple";
export type SearchFilterFieldConfig<T> = {
    key: keyof SearchFilterType<T>;
    label: string;
    uiType: SearchFilterUIType;
    options?: {
        label: string;
        value: string;
        default?: boolean;
    }[];
};
export type SearchSortFieldConfig<T> = {
    key: keyof T;
    label: string;
};
export type SearchConfig<T> = {
    filters: SearchFilterFieldConfig<T>[];
    sorting: SearchSortFieldConfig<T>[];
    defaultSort: SearchSortType<T>[];
    pageSizes?: number[];
    deafultPageSize?: number;
    searchField?: {
        label?: string;
    };
};
export {};
//# sourceMappingURL=search.types.d.ts.map