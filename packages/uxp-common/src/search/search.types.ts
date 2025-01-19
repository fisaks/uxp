import { DateTime } from "luxon";

type FilterOption<DataEntity> = {
    field: keyof DataEntity; // The field to filter on
    value: string | number | boolean | null;
    operator: "eq" | "lt" | "gt" | "contains"; // The filtering operator
};

type SortOption<DataEntity> = {
    field: keyof DataEntity; // The field to sort by
    direction: "asc" | "desc"; // The sorting direction
};

type PaginationOption = {
    page: number; // The current page number
    size: number; // The number of items per page
};

export type SearchRequest<DataEntity> = {
    filters?: FilterOption<DataEntity>[]; // Optional list of filters
    search?: string | string[];
    sort?: SortOption<DataEntity>[]; // Optional sorting option
    pagination: PaginationOption; // Pagination information
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
} & { [K in keyof T as `${string & K}Start` | `${string & K}End`]?: DateTime | null } & { search?: string | null };

export type SearchSortType<T> = {
    field: keyof T | null;
    direction: "asc" | "desc";
};

export type SearchFilterUIType = "text" | "datetime" | "selectOne" | "selectMultiple";

export type SearchFilterFieldConfig<T> = {
    //key: keyof T | `${string & keyof T}Start` | `${string & keyof T}End`; // Field in the entity
    key: keyof SearchFilterType<T>;
    label: string; // Label for the field
    uiType: SearchFilterUIType; // UI component type
    options?: { label: string; value: string; default?: boolean }[]; // Only for select fields
};

export type SearchSortFieldConfig<T> = {
    key: keyof T; // Field in the entity
    label: string; // Label for the sorting option
};

export type SearchConfig<T> = {
    filters: SearchFilterFieldConfig<T>[]; // Fields for filtering
    sorting: SearchSortFieldConfig<T>[]; // Fields for sorting
    defaultSort: SearchSortType<T>[]; // Fields for sorting
    pageSizes?: number[]; // Optional page size options
    deafultPageSize?: number; // Optional Default page size
    searchField?: { label?: string };
};
