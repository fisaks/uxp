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
    sort?: SortOption<DataEntity>; // Optional sorting option
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
