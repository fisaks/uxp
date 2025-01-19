import React from "react";
import { ExpandMore } from "@mui/icons-material";
import { Box, Button, Collapse, debounce, Grid, TextField } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { SearchConfig, SearchFilterType, SearchSortType } from "@uxp/common";
import { useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { FilterPanel } from "./FilterPanel";
import { PageSizeSelector } from "./PageSizeSelector";
import { SortingPanel } from "./SortingPanel";

export type SearchRef<T> = {
    triggerSearch: () => void; // Method exposed to parent components
};

type SearchProps<T> = {
    config: SearchConfig<T>;
    onSearch: (filters: SearchFilterType<T>, sort: SearchSortType<T>[], pageSize: number) => void;
    searchRef?: React.Ref<SearchRef<T>>;
};

export const SearchComponent = <T,>({ config, onSearch, searchRef }: SearchProps<T>) => {
    const [filters, setFilters] = useState<SearchFilterType<T>>({});
    const [sortOptions, setSortOptions] = useState<SearchSortType<T>[]>(config.defaultSort ?? []);
    const [pageSize, setPageSize] = useState<number>(config.deafultPageSize ?? 10);
    const [isAdvancedFiltersVisible, setIsAdvancedFiltersVisible] = useState(false);

    const handleFilterChange = useCallback((key: keyof SearchFilterType<T>, value: any) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleSortChange = useCallback((index: number, key: keyof T, direction: "asc" | "desc") => {
        setSortOptions((prev) => {
            const updated = [...prev];
            updated[index] = { field: key, direction };
            return updated;
        });
    }, []);

    const addSortOption = useCallback(() => {
        const defaultField = config.sorting[0]?.key;
        setSortOptions((prev) => [...prev, { field: defaultField, direction: "asc" }]);
    }, []);

    const removeSortOption = useCallback((index: number) => {
        setSortOptions((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const toggleSortDirection = useCallback((index: number) => {
        setSortOptions((prev) => {
            const updated = [...prev];
            updated[index].direction = updated[index].direction === "asc" ? "desc" : "asc";
            return updated;
        });
    }, []);

    const debouncedSearch = useMemo(() => debounce(onSearch, 500), [onSearch]);

    const triggerSearch = useCallback(() => {
        onSearch(filters, sortOptions, pageSize);
    }, [filters, sortOptions, pageSize, onSearch]);

    useImperativeHandle(searchRef, () => ({
        triggerSearch,
    }));

    useEffect(() => {
        debouncedSearch(filters, sortOptions, pageSize);
        return debouncedSearch.clear;
    }, [filters, sortOptions, pageSize, debouncedSearch]);

    return (
        <LocalizationProvider dateAdapter={AdapterLuxon} adapterLocale={navigator.language}>
            <Box sx={{ mt: 2, mb: 2 }}>
                <TextField
                    label={config.searchField?.label ?? "Free Text Search"}
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                    fullWidth
                />
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                <Button
                    variant="outlined"
                    startIcon={<ExpandMore />}
                    onClick={() => setIsAdvancedFiltersVisible(!isAdvancedFiltersVisible)}
                >
                    {isAdvancedFiltersVisible ? "Hide Filters" : "Show Filters"}
                </Button>
            </Box>
            <Collapse in={isAdvancedFiltersVisible}>
                <FilterPanel config={config} filters={filters} handleFilterChange={handleFilterChange} />

                {/* Page Size */}
                <Grid item xs={12} sm={6}>
                    <PageSizeSelector pageSize={pageSize} setPageSize={setPageSize} pageSizes={config.pageSizes} />
                </Grid>
                <SortingPanel
                    config={config}
                    sortOptions={sortOptions}
                    handleSortChange={handleSortChange}
                    addSortOption={addSortOption}
                    removeSortOption={removeSortOption}
                    toggleSortDirection={toggleSortDirection}
                />
            </Collapse>
        </LocalizationProvider>
    );
};
